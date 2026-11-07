import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { isSafeId } from "@/lib/security/ids";

/** True when platformAdmins/{uid} exists. That document is written only by scripts/bootstrap-admin.js. */
export async function isPlatformAdmin(uid) {
  if (!isSafeId(uid)) return false;
  const snap = await adminDb().doc(`platformAdmins/${uid}`).get();
  return snap.exists;
}

/** Tenant status for the dashboard guard. Returns null when the tenant does not exist. */
export async function getTenantStatus(tenantId) {
  if (!isSafeId(tenantId)) return null;
  const snap = await adminDb().doc(`tenants/${tenantId}`).get();
  return snap.exists ? (snap.data().status ?? null) : null;
}
