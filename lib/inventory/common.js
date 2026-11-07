import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { canAccessBranch } from "@/lib/permissions/matrix";
import { forbidden } from "@/lib/security/errors";

export const iso = (value) => value?.toDate?.().toISOString() ?? null;
export const col = (ctx, name) => adminDb().collection(`tenants/${ctx.tenantId}/${name}`);
export const docRef = (ctx, name, id) => adminDb().doc(`tenants/${ctx.tenantId}/${name}/${id}`);

export const mayUseBranch = (ctx, branchId) => canAccessBranch({ allBranches: ctx.allBranches, branchIds: ctx.branchIds }, branchId);

/** Throws the generic 403 when the member may not work in this branch. */
export function assertBranch(ctx, branchId) {
  if (!mayUseBranch(ctx, branchId)) throw forbidden();
}

export const auditEntry = (ctx, action, targetType, targetId, extra = {}) => ({
  action,
  actorUid: ctx.user.uid,
  targetType,
  targetId,
  ...extra,
  createdAt: new Date(),
});

/** Runs a Firestore query once per chunk of ids (an `in` filter is limited), merging the documents. */
export async function queryInChunks(baseQuery, field, ids, chunkSize = 10) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));
  const snaps = await Promise.all(chunks.map((chunk) => baseQuery.where(field, "in", chunk).get()));
  return snaps.flatMap((s) => s.docs);
}
