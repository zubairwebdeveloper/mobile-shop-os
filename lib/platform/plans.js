import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { buildPlanDoc } from "./subscription";

/**
 * Plan definitions live in platformPlans/{planId} and drive the pricing page (Phase 18).
 * Editing a plan does NOT silently change existing shops: a shop keeps the limits snapshot it was
 * given until an admin re-saves its subscription (see updateTenantSubscription).
 */

const serialize = (doc) => {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name,
    description: d.description ?? "",
    priceMonthly: d.priceMonthly ?? null,
    currency: d.currency ?? "PKR",
    limits: d.limits ?? {},
    features: d.features ?? [],
    isPublic: d.isPublic === true,
    status: d.status ?? "ACTIVE",
    sortOrder: d.sortOrder ?? 0,
    isPlaceholder: d.isPlaceholder === true,
  };
};

export async function listPlans() {
  const snap = await adminDb().collection("platformPlans").orderBy("sortOrder", "asc").get();
  return snap.docs.map(serialize);
}

export async function createPlan(adminUid, input) {
  const db = adminDb();
  const ref = db.doc(`platformPlans/${input.id}`);

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) {
      throw conflict("PLAN_EXISTS", "A plan with this ID already exists.");
    }
    const now = FieldValue.serverTimestamp();
    tx.set(ref, { ...buildPlanDoc(input), createdAt: now, updatedAt: now });
    tx.set(db.collection("platformAuditLogs").doc(), {
      action: "PLAN_CREATED",
      actorUid: adminUid,
      targetType: "plan",
      targetId: input.id,
      createdAt: now,
    });
  });
}

export async function updatePlan(adminUid, planId, input) {
  if (!isSafeId(planId)) throw notFound("Plan not found.");
  const db = adminDb();
  const ref = db.doc(`platformPlans/${planId}`);

  await db.runTransaction(async (tx) => {
    if (!(await tx.get(ref)).exists) throw notFound("Plan not found.");
    const now = FieldValue.serverTimestamp();
    // isPlaceholder is cleared once an admin has reviewed and saved the plan
    tx.update(ref, { ...buildPlanDoc(input), isPlaceholder: false, updatedAt: now });
    tx.set(db.collection("platformAuditLogs").doc(), {
      action: "PLAN_UPDATED",
      actorUid: adminUid,
      targetType: "plan",
      targetId: planId,
      createdAt: now,
    });
  });
}
