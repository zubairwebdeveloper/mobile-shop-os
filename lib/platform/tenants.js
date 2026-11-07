import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { listTenantAuditLogs } from "./audit";
import { findLimitViolations } from "./subscription";

const iso = (value) => value?.toDate?.().toISOString() ?? null;

/** Latest tenants first. Up to `limit` rows (filtering and search happen in the browser on this set). */
export async function listTenants(limit = 200) {
  const snap = await adminDb().collection("tenants").orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name,
      slug: d.slug,
      status: d.status,
      planId: d.planId ?? null,
      ownerName: d.profile?.ownerName ?? null,
      city: d.profile?.city ?? null,
      branchesUsed: d.counters?.branches ?? 0,
      maxBranches: d.limits?.maxBranches ?? 0,
      subscriptionStatus: d.subscription?.status ?? null,
      createdAt: iso(d.createdAt),
    };
  });
}

export async function getTenantDetail(tenantId) {
  if (!isSafeId(tenantId)) return null;
  const db = adminDb();
  const tenantSnap = await db.doc(`tenants/${tenantId}`).get();
  if (!tenantSnap.exists) return null;
  const d = tenantSnap.data();

  const [ownerSnap, memberCount, recentAudit] = await Promise.all([
    d.ownerUid ? db.doc(`tenants/${tenantId}/members/${d.ownerUid}`).get() : null,
    db.collection(`tenants/${tenantId}/members`).where("status", "==", "ACTIVE").count().get(),
    listTenantAuditLogs(tenantId, 10),
  ]);

  return {
    id: tenantId,
    name: d.name,
    slug: d.slug,
    status: d.status,
    planId: d.planId ?? null,
    limits: d.limits ?? {},
    counters: d.counters ?? {},
    profile: d.profile ?? {},
    settings: d.settings ?? {},
    owner: {
      uid: d.ownerUid ?? null,
      name: d.profile?.ownerName ?? ownerSnap?.data()?.displayName ?? null,
      email: ownerSnap?.exists ? (ownerSnap.data().email ?? null) : null,
    },
    subscription: {
      status: d.subscription?.status ?? null,
      renewsAt: iso(d.subscription?.renewsAt),
    },
    suspension: {
      reason: d.suspensionReason ?? null,
      at: iso(d.suspendedAt),
    },
    activeMembers: memberCount.data().count,
    createdAt: iso(d.createdAt),
    recentAudit,
  };
}

/**
 * Suspend or reactivate a shop. Valid transitions only: ACTIVE -> SUSPENDED and SUSPENDED -> ACTIVE.
 * Suspension takes effect immediately everywhere: requireTenantAccess() and the Firestore/Storage
 * rules all require tenant.status == ACTIVE. Data is kept untouched.
 */
export async function setTenantStatus(adminUid, tenantId, action, reason) {
  if (!isSafeId(tenantId)) throw notFound("Shop not found.");
  const db = adminDb();
  const tenantRef = db.doc(`tenants/${tenantId}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tenantRef);
    if (!snap.exists) throw notFound("Shop not found.");
    const status = snap.data().status;
    const now = FieldValue.serverTimestamp();

    if (action === "SUSPEND") {
      if (status !== "ACTIVE") throw conflict("INVALID_STATE", "Only active shops can be suspended.");
      tx.update(tenantRef, {
        status: "SUSPENDED",
        suspensionReason: reason,
        suspendedAt: now,
        suspendedBy: adminUid,
        updatedAt: now,
      });
    } else {
      if (status !== "SUSPENDED") throw conflict("INVALID_STATE", "Only suspended shops can be reactivated.");
      tx.update(tenantRef, {
        status: "ACTIVE",
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
        reactivatedAt: now,
        reactivatedBy: adminUid,
        updatedAt: now,
      });
    }

    const auditAction = action === "SUSPEND" ? "TENANT_SUSPENDED" : "TENANT_REACTIVATED";
    const entry = {
      action: auditAction,
      actorUid: adminUid,
      targetType: "tenant",
      targetId: tenantId,
      tenantId,
      reason: action === "SUSPEND" ? reason : null,
      createdAt: now,
    };
    tx.set(db.collection("platformAuditLogs").doc(), entry);
    tx.set(tenantRef.collection("auditLogs").doc(), entry);
  });
}

/**
 * Manual subscription management (no payment gateway; Phase 17 adds trials/billing records).
 * Sets plan, status and renewal date in one transaction and appends a history entry.
 *  - Saving a plan copies that plan's limits onto the shop (a snapshot), also when re-saving the same plan.
 *  - A downgrade is refused while current usage exceeds the new limits.
 *  - If the shop's current plan has no plan record yet (e.g. the placeholder "starter" before plans are
 *    created) and the plan is unchanged, only status/renewal are updated and limits stay as they are.
 */
export async function updateTenantSubscription(adminUid, tenantId, input) {
  if (!isSafeId(tenantId)) throw notFound("Shop not found.");
  const db = adminDb();
  const tenantRef = db.doc(`tenants/${tenantId}`);
  const planRef = db.doc(`platformPlans/${input.planId}`);

  await db.runTransaction(async (tx) => {
    const [tenantSnap, planSnap] = await Promise.all([tx.get(tenantRef), tx.get(planRef)]);
    if (!tenantSnap.exists) throw notFound("Shop not found.");
    const tenant = tenantSnap.data();
    const planChanged = tenant.planId !== input.planId;

    if (!planSnap.exists && planChanged) throw notFound("Plan not found.");
    if (planSnap.exists && planChanged && planSnap.data().status !== "ACTIVE") {
      throw conflict("PLAN_UNAVAILABLE", "That plan is archived and cannot be assigned.");
    }

    const now = FieldValue.serverTimestamp();
    const update = {
      planId: input.planId,
      subscription: {
        status: input.status,
        renewsAt: input.renewsAt === "" ? null : Timestamp.fromDate(new Date(`${input.renewsAt}T00:00:00Z`)),
        updatedAt: now,
        updatedBy: adminUid,
      },
      updatedAt: now,
    };

    if (planSnap.exists) {
      const newLimits = planSnap.data().limits ?? {};
      const violations = findLimitViolations(tenant.counters, newLimits);
      if (violations.length > 0) throw conflict("DOWNGRADE_BLOCKED", violations.join(" "));
      update.limits = { ...newLimits };
    }

    tx.update(tenantRef, update);
    tx.set(tenantRef.collection("subscriptionHistory").doc(), {
      fromPlanId: tenant.planId ?? null,
      toPlanId: input.planId,
      fromStatus: tenant.subscription?.status ?? null,
      toStatus: input.status,
      note: input.note,
      changedBy: adminUid,
      createdAt: now,
    });
    tx.set(db.collection("platformAuditLogs").doc(), {
      action: "TENANT_SUBSCRIPTION_UPDATED",
      actorUid: adminUid,
      targetType: "tenant",
      targetId: tenantId,
      tenantId,
      createdAt: now,
    });
  });
}
