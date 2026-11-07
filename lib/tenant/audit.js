import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { isSafeId } from "@/lib/security/ids";

const iso = (value) => value?.toDate?.().toISOString() ?? null;

const serialize = (doc) => {
  const d = doc.data();
  return {
    id: doc.id,
    action: d.action ?? "UNKNOWN",
    actorUid: d.actorUid ?? null,
    targetType: d.targetType ?? null,
    targetId: d.targetId ?? null,
    tenantId: null,
    reason: d.reason ?? null,
    createdAt: iso(d.createdAt),
  };
};

/** Newest-first page of THIS shop's audit log. ctx must come from requireTenantAccess(audit:read). */
export async function listShopAuditLogs(ctx, { limit = 50, cursor } = {}) {
  const collection = adminDb().collection(`tenants/${ctx.tenantId}/auditLogs`);
  let query = collection.orderBy("createdAt", "desc").limit(limit + 1);

  if (isSafeId(cursor)) {
    const cursorSnap = await collection.doc(cursor).get();
    if (cursorSnap.exists) query = query.startAfter(cursorSnap);
  }

  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  return {
    entries: docs.map(serialize),
    nextCursor: snap.docs.length > limit ? docs[docs.length - 1].id : null,
  };
}
