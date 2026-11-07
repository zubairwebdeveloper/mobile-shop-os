import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/auth/session";
import { canAccessBranch, can } from "@/lib/permissions/matrix";
import { forbidden } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";

export { isSafeId };

/**
 * THE central tenant authorization gate. Every server route/action that touches tenant data
 * must call this first and use the returned tenantId, never a tenantId from the request body.
 *
 * It verifies, server-side and from the database (not from the browser):
 *  1. a valid, non-revoked session
 *  2. the tenant exists and is ACTIVE
 *  3. the user has a membership in THIS tenant and it is ACTIVE
 *  4. (optional) the role grants `permission`
 *  5. (optional) the member may access `branchId`
 *
 * Missing tenant, missing membership, suspended tenant, wrong role and wrong branch all produce
 * the same 403, so callers cannot probe which tenant IDs exist.
 */
export async function requireTenantAccess(tenantId, { permission, branchId } = {}) {
  if (!isSafeId(tenantId)) throw forbidden();

  const user = await requireUser();
  const db = adminDb();

  const [tenantSnap, memberSnap] = await Promise.all([
    db.doc(`tenants/${tenantId}`).get(),
    db.doc(`tenants/${tenantId}/members/${user.uid}`).get(),
  ]);

  if (!tenantSnap.exists || !memberSnap.exists) throw forbidden();

  const tenant = tenantSnap.data();
  const member = memberSnap.data();

  if (tenant.status !== "ACTIVE" || member.status !== "ACTIVE") throw forbidden();
  if (permission && !can(member.role, permission)) throw forbidden();
  if (branchId !== undefined && !canAccessBranch(member, branchId)) throw forbidden();

  return {
    user,
    tenantId,
    role: member.role,
    allBranches: member.allBranches === true,
    branchIds: Array.isArray(member.branchIds) ? member.branchIds : [],
    tenant: {
      name: tenant.name ?? null,
      planId: tenant.planId ?? null,
      limits: tenant.limits ?? {},
      counters: tenant.counters ?? {},
    },
  };
}

/** Platform super-admin gate. platformAdmins/{uid} is written only by the bootstrap script. */
export async function requirePlatformAdmin() {
  const user = await requireUser();
  const snap = await adminDb().doc(`platformAdmins/${user.uid}`).get();
  if (!snap.exists) throw forbidden();
  return { user, level: snap.data()?.level ?? "ADMIN" };
}

/**
 * Tenants the user belongs to, from the server-written reverse index
 * userTenants/{uid}/memberships/{tenantId}. Used for the tenant switcher only; access to a
 * tenant is still decided by requireTenantAccess().
 */
export async function listUserTenants(uid) {
  const snap = await adminDb().collection(`userTenants/${uid}/memberships`).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((m) => m.status === "ACTIVE")
    .map((m) => ({ id: m.id, name: m.tenantName ?? m.id, role: m.role }));
}

/**
 * Picks the active tenant: the hinted one only if the user really belongs to it,
 * otherwise the first membership. The hint (a cookie/param) is NEVER trusted on its own.
 */
export async function resolveActiveTenant(uid, hintedTenantId) {
  const tenants = await listUserTenants(uid);
  const hinted = tenants.find((t) => t.id === hintedTenantId);
  const activeTenantId = hinted?.id ?? tenants[0]?.id ?? null;
  return { activeTenantId, tenants };
}
