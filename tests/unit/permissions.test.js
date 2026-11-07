import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  ROLES,
  can,
  canAccessBranch,
  isValidRole,
  permissionsFor,
} from "@/lib/permissions/matrix";

describe("permission matrix", () => {
  it("OWNER has every permission", () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(can(ROLES.OWNER, permission)).toBe(true);
    }
  });

  it("only OWNER manages members, settings and reads the audit log", () => {
    for (const permission of [PERMISSIONS.MEMBERS_MANAGE, PERMISSIONS.SETTINGS_WRITE, PERMISSIONS.AUDIT_READ]) {
      expect(can(ROLES.OWNER, permission)).toBe(true);
      for (const role of [ROLES.MANAGER, ROLES.CASHIER, ROLES.TECHNICIAN, ROLES.ACCOUNTANT]) {
        expect(can(role, permission)).toBe(false);
      }
    }
  });

  it("CASHIER can sell but cannot read finance, purchases, employees or private customer data", () => {
    expect(can(ROLES.CASHIER, PERMISSIONS.SALES_CREATE)).toBe(true);
    expect(can(ROLES.CASHIER, PERMISSIONS.FINANCE_READ)).toBe(false);
    expect(can(ROLES.CASHIER, PERMISSIONS.PURCHASES_READ)).toBe(false);
    expect(can(ROLES.CASHIER, PERMISSIONS.EMPLOYEES_READ)).toBe(false);
    expect(can(ROLES.CASHIER, PERMISSIONS.CUSTOMERS_PRIVATE_READ)).toBe(false);
    expect(can(ROLES.CASHIER, PERMISSIONS.SALES_REFUND_APPROVE)).toBe(false);
  });

  it("TECHNICIAN works on repairs but cannot see sales or finance", () => {
    expect(can(ROLES.TECHNICIAN, PERMISSIONS.REPAIRS_WRITE)).toBe(true);
    expect(can(ROLES.TECHNICIAN, PERMISSIONS.SALES_READ)).toBe(false);
    expect(can(ROLES.TECHNICIAN, PERMISSIONS.FINANCE_READ)).toBe(false);
  });

  it("ACCOUNTANT reads sales/purchases and manages finance but cannot create sales", () => {
    expect(can(ROLES.ACCOUNTANT, PERMISSIONS.FINANCE_WRITE)).toBe(true);
    expect(can(ROLES.ACCOUNTANT, PERMISSIONS.SALES_READ)).toBe(true);
    expect(can(ROLES.ACCOUNTANT, PERMISSIONS.SALES_CREATE)).toBe(false);
    expect(can(ROLES.ACCOUNTANT, PERMISSIONS.REPAIRS_READ)).toBe(false);
  });

  it("denies unknown roles and unknown permissions", () => {
    expect(can("SUPERUSER", PERMISSIONS.SALES_READ)).toBe(false);
    expect(can(undefined, PERMISSIONS.SALES_READ)).toBe(false);
    expect(can(ROLES.OWNER, "made:up")).toBe(false);
    expect(isValidRole("toString")).toBe(false); // prototype keys are not roles
    expect(permissionsFor("constructor")).toEqual([]);
  });

  it("permissionsFor returns a copy (callers cannot mutate the matrix)", () => {
    const list = permissionsFor(ROLES.CASHIER);
    list.push(PERMISSIONS.FINANCE_READ);
    expect(can(ROLES.CASHIER, PERMISSIONS.FINANCE_READ)).toBe(false);
  });
});

describe("branch access", () => {
  it("allBranches grants every branch", () => {
    expect(canAccessBranch({ allBranches: true, branchIds: [] }, "B1")).toBe(true);
  });

  it("explicit list grants only listed branches", () => {
    const member = { allBranches: false, branchIds: ["B1"] };
    expect(canAccessBranch(member, "B1")).toBe(true);
    expect(canAccessBranch(member, "B2")).toBe(false);
  });

  it("missing or malformed data denies", () => {
    expect(canAccessBranch(null, "B1")).toBe(false);
    expect(canAccessBranch({}, "B1")).toBe(false);
    expect(canAccessBranch({ branchIds: "B1" }, "B1")).toBe(false);
    expect(canAccessBranch({ allBranches: "true" }, "B1")).toBe(false);
    expect(canAccessBranch({ allBranches: true }, "")).toBe(false);
    expect(canAccessBranch({ allBranches: true }, undefined)).toBe(false);
  });
});
