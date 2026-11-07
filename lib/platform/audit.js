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
    tenantId: d.tenantId ?? null,
    reason: d.reason ?? null,
    createdAt: iso(d.createdAt),
  };
};

/**
 * Newest-first page of the platform audit log. The cursor is the ID of the last entry of the previous
 * page; Firestore resumes after that exact document (stable even when timestamps tie).
 * An unknown or malformed cursor is ignored (first page) instead of failing.
 */
export async function listPlatformAuditLogs({ limit = 50, cursor } = {}) {
  const collection = adminDb().collection("platformAuditLogs");
  let query = collection.orderBy("createdAt", "desc").limit(limit + 1);

  if (isSafeId(cursor)) {
    const cursorSnap = await collection.doc(cursor).get();
    if (cursorSnap.exists) query = query.startAfter(cursorSnap);
  }

  const snap = await query.get();
  const docs = snap.docs.slice(0, limit);
  const hasMore = snap.docs.length > limit;

  return {
    entries: docs.map(serialize),
    nextCursor: hasMore ? docs[docs.length - 1].id : null,
  };
}

export async function listTenantAuditLogs(tenantId, limit = 10) {
  if (!isSafeId(tenantId)) return [];
  const snap = await adminDb()
    .collection(`tenants/${tenantId}/auditLogs`)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(serialize);
}
