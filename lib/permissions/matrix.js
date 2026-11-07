/**
 * Role -> permission matrix. Pure JS (no server-only import) so it can be unit-tested and
 * used for UI hints. The AUTHORITY is always the server (requireTenantAccess) and the Firestore
 * rules; hiding a button in the UI is never a control.
 *
 * KEEP IN SYNC with firestore.rules / storage.rules role lists (see docs/PERMISSIONS.md).
 */

export const ROLES = Object.freeze({
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  TECHNICIAN: "TECHNICIAN",
  ACCOUNTANT: "ACCOUNTANT",
});

export const PERMISSIONS = Object.freeze({
  CATALOG_READ: "catalog:read",
  CATALOG_WRITE: "catalog:write",
  INVENTORY_READ: "inventory:read",
  INVENTORY_ADJUST: "inventory:adjust",
  SALES_READ: "sales:read",
  SALES_CREATE: "sales:create",
  SALES_REFUND_APPROVE: "sales:refund-approve",
  PURCHASES_READ: "purchases:read",
  PURCHASES_WRITE: "purchases:write",
  CUSTOMERS_READ: "customers:read",
  CUSTOMERS_WRITE: "customers:write",
  CUSTOMERS_PRIVATE_READ: "customers:private-read",
  REPAIRS_READ: "repairs:read",
  REPAIRS_WRITE: "repairs:write",
  FINANCE_READ: "finance:read",
  FINANCE_WRITE: "finance:write",
  EMPLOYEES_READ: "employees:read",
  EMPLOYEES_WRITE: "employees:write",
  MEMBERS_MANAGE: "members:manage",
  SETTINGS_WRITE: "settings:write",
  AUDIT_READ: "audit:read",
});

const P = PERMISSIONS;

const ALL = Object.values(PERMISSIONS);

const ROLE_PERMISSIONS = Object.freeze({
  OWNER: ALL,
  MANAGER: ALL.filter(
    (p) => p !== P.MEMBERS_MANAGE && p !== P.SETTINGS_WRITE && p !== P.AUDIT_READ
  ),
  CASHIER: [
    P.CATALOG_READ,
    P.INVENTORY_READ,
    P.SALES_READ,
    P.SALES_CREATE,
    P.CUSTOMERS_READ,
    P.CUSTOMERS_WRITE,
    P.REPAIRS_READ,
  ],
  TECHNICIAN: [
    P.CATALOG_READ,
    P.INVENTORY_READ,
    P.CUSTOMERS_READ,
    P.REPAIRS_READ,
    P.REPAIRS_WRITE,
  ],
  ACCOUNTANT: [
    P.CATALOG_READ,
    P.INVENTORY_READ,
    P.SALES_READ,
    P.PURCHASES_READ,
    P.FINANCE_READ,
    P.FINANCE_WRITE,
  ],
});

export function isValidRole(role) {
  return typeof role === "string" && Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role);
}

export function permissionsFor(role) {
  return isValidRole(role) ? [...ROLE_PERMISSIONS[role]] : [];
}

/** Unknown role or unknown permission -> false (deny by default). */
export function can(role, permission) {
  if (!isValidRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Branch access. A member either has access to all branches or to an explicit list.
 * Missing/invalid data -> no access.
 */
export function canAccessBranch(member, branchId) {
  if (!member || typeof branchId !== "string" || branchId.length === 0) return false;
  if (member.allBranches === true) return true;
  return Array.isArray(member.branchIds) && member.branchIds.includes(branchId);
}
