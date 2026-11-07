import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS, DEFAULT_PLAN_ID } from "@/lib/plans/defaults";
import { buildTenantBundle } from "@/lib/tenant/bundle";

const application = {
  applicantUid: "uid-1",
  applicantEmail: "owner@example.test",
  shopName: "Smart Mobile Hub",
  slug: "smart-mobile-hub",
  ownerName: "Ali Khan",
  phone: "+92 300 1234567",
  city: "Lahore",
  address: "Hall Road, Lahore",
  expectedBranches: 2,
};

describe("buildTenantBundle", () => {
  it("creates an ACTIVE tenant owned by the applicant", () => {
    const { tenant } = buildTenantBundle({ application });
    expect(tenant.name).toBe("Smart Mobile Hub");
    expect(tenant.slug).toBe("smart-mobile-hub");
    expect(tenant.status).toBe("ACTIVE");
    expect(tenant.ownerUid).toBe("uid-1");
    expect(tenant.planId).toBe(DEFAULT_PLAN_ID);
    expect(tenant.counters.branches).toBe(1);
    expect(tenant.settings.currency).toBe("PKR");
  });

  it("gives the applicant an OWNER membership with access to all branches", () => {
    const { member, membershipIndex } = buildTenantBundle({ application });
    expect(member.role).toBe("OWNER");
    expect(member.status).toBe("ACTIVE");
    expect(member.allBranches).toBe(true);
    expect(member.branchIds).toEqual([]);
    expect(member.email).toBe("owner@example.test");
    expect(membershipIndex.role).toBe("OWNER");
    expect(membershipIndex.tenantName).toBe("Smart Mobile Hub");
  });

  it("creates the main branch from the application details", () => {
    const { branch } = buildTenantBundle({ application });
    expect(branch.name).toBe("Main Branch");
    expect(branch.isMain).toBe(true);
    expect(branch.active).toBe(true);
    expect(branch.address).toBe("Hall Road, Lahore");
  });

  it("copies the limits so mutating a tenant can never change the shared defaults", () => {
    const { tenant } = buildTenantBundle({ application });
    expect(tenant.limits).toEqual({ ...DEFAULT_LIMITS });
    tenant.limits.maxBranches = 999;
    expect(DEFAULT_LIMITS.maxBranches === 999).toBe(false);
  });

  it("prefers the Auth display name, then the application owner name", () => {
    expect(buildTenantBundle({ application, ownerDisplayName: "Display Name" }).member.displayName).toBe("Display Name");
    expect(buildTenantBundle({ application }).member.displayName).toBe("Ali Khan");
  });

  it("adds no timestamps (the caller supplies server timestamps)", () => {
    const bundle = buildTenantBundle({ application });
    for (const doc of Object.values(bundle)) {
      expect("createdAt" in doc).toBe(false);
      expect("updatedAt" in doc).toBe(false);
    }
  });

  it("refuses an application without an applicant", () => {
    expect(() => buildTenantBundle({ application: null })).toThrow();
    expect(() => buildTenantBundle({ application: { ...application, applicantUid: "" } })).toThrow();
    expect(() => buildTenantBundle({ application: { ...application, applicantUid: undefined } })).toThrow();
  });
});
