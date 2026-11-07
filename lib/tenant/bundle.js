import { DEFAULT_LIMITS, DEFAULT_PLAN_ID } from "../plans/defaults.js";

/**
 * PURE function: turns an approved application into the documents that make up a new tenant.
 * No database access and no timestamps (the caller adds server timestamps), so it can be
 * unit-tested exhaustively. The caller writes all of it in ONE transaction.
 */
export function buildTenantBundle({ application, ownerDisplayName }) {
  if (!application || typeof application.applicantUid !== "string" || application.applicantUid === "") {
    throw new Error("Invalid application");
  }

  const ownerName = ownerDisplayName || application.ownerName || "Owner";

  return {
    tenant: {
      name: application.shopName,
      slug: application.slug,
      status: "ACTIVE",
      ownerUid: application.applicantUid,
      planId: DEFAULT_PLAN_ID,
      limits: { ...DEFAULT_LIMITS },
      counters: { branches: 1 },
      settings: { currency: "PKR", timezone: "Asia/Karachi", locale: "en" },
      profile: {
        ownerName: application.ownerName,
        phone: application.phone,
        city: application.city,
        address: application.address,
      },
    },
    member: {
      role: "OWNER",
      status: "ACTIVE",
      allBranches: true,
      branchIds: [],
      displayName: ownerName,
      email: application.applicantEmail ?? null,
    },
    membershipIndex: {
      tenantName: application.shopName,
      role: "OWNER",
      status: "ACTIVE",
    },
    branch: {
      name: "Main Branch",
      address: application.address,
      phone: application.phone,
      active: true,
      isMain: true,
    },
  };
}
