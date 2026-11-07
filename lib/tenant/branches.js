import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { conflict, forbidden, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";

/**
 * Branch services. `ctx` MUST be the result of requireTenantAccess(): tenantId, user and branch
 * scope come from there, never from request input.
 */

const serialize = (doc) => {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name,
    address: d.address ?? "",
    phone: d.phone ?? "",
    active: d.active !== false,
    isMain: d.isMain === true,
  };
};

/** Branches this member may see (all of them for allBranches roles, else their assigned ones). */
export async function listBranches(ctx) {
  const snap = await adminDb()
    .collection(`tenants/${ctx.tenantId}/branches`)
    .orderBy("createdAt", "asc")
    .get();

  return snap.docs
    .filter((doc) => ctx.allBranches || ctx.branchIds.includes(doc.id))
    .map(serialize);
}

/**
 * Creates a branch, enforcing the plan's branch limit inside the same transaction that
 * increments the tenant's branch counter (two simultaneous requests cannot exceed the limit).
 */
export async function createBranch(ctx, input) {
  const db = adminDb();
  const tenantRef = db.doc(`tenants/${ctx.tenantId}`);
  const branchRef = tenantRef.collection("branches").doc();

  await db.runTransaction(async (tx) => {
    const tenantSnap = await tx.get(tenantRef);
    if (!tenantSnap.exists) throw forbidden();

    const tenant = tenantSnap.data();
    const max = tenant.limits?.maxBranches ?? 0;
    const count = tenant.counters?.branches ?? 0;
    if (count >= max) {
      throw conflict("BRANCH_LIMIT_REACHED", "Your plan's branch limit has been reached.");
    }

    const now = FieldValue.serverTimestamp();
    tx.set(branchRef, {
      name: input.name,
      address: input.address,
      phone: input.phone,
      active: true,
      isMain: false,
      createdAt: now,
      createdBy: ctx.user.uid,
    });
    tx.update(tenantRef, { "counters.branches": FieldValue.increment(1), updatedAt: now });
    tx.set(tenantRef.collection("auditLogs").doc(), {
      action: "BRANCH_CREATED",
      actorUid: ctx.user.uid,
      targetType: "branch",
      targetId: branchRef.id,
      createdAt: now,
    });
  });

  return { id: branchRef.id };
}

export async function updateBranch(ctx, branchId, input) {
  if (!isSafeId(branchId)) throw notFound("Branch not found.");

  const db = adminDb();
  const branchRef = db.doc(`tenants/${ctx.tenantId}/branches/${branchId}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(branchRef);
    if (!snap.exists) throw notFound("Branch not found.");

    const now = FieldValue.serverTimestamp();
    tx.update(branchRef, {
      name: input.name,
      address: input.address,
      phone: input.phone,
      updatedAt: now,
    });
    tx.set(db.collection(`tenants/${ctx.tenantId}/auditLogs`).doc(), {
      action: "BRANCH_UPDATED",
      actorUid: ctx.user.uid,
      targetType: "branch",
      targetId: branchId,
      createdAt: now,
    });
  });
}
