/**
 * Integration tests for onboarding + branches against the Firebase Auth and Firestore EMULATORS
 * using the real Admin SDK. Run with:  npm run test:integration
 * (firebase emulators:exec sets FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST)
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { createBranch, listBranches, updateBranch } from "@/lib/tenant/branches";
import {
  approveApplication,
  getUserApplication,
  listPendingApplications,
  rejectApplication,
  submitApplication,
} from "@/lib/tenant/onboarding";

const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID || "demo-msos";
const ADMIN_UID = "platform-admin";

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Run these tests through the emulators: npm run test:integration");
  }
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: "DELETE" }
  );
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, {
    method: "DELETE",
  });
});

async function makeUser(uid, { verified = true, name = "Test Owner" } = {}) {
  const email = `${uid}@example.test`;
  await adminAuth().createUser({ uid, email, emailVerified: verified, displayName: name, password: "Test#12345" });
  return { uid, email };
}

const input = (overrides = {}) => ({
  shopName: "Smart Mobile Hub",
  slug: "smart-mobile-hub",
  ownerName: "Test Owner",
  phone: "+92 300 1234567",
  city: "Lahore",
  address: "Hall Road, Lahore",
  expectedBranches: 2,
  ...overrides,
});

async function approvedTenant(uid, slug) {
  const user = await makeUser(uid);
  await submitApplication(user, input({ slug, shopName: `Shop ${slug}` }));
  const { tenantId } = await approveApplication(ADMIN_UID, uid);
  return { user, tenantId };
}

const ownerCtx = (tenantId, uid) => ({ tenantId, user: { uid }, allBranches: true, branchIds: [] });
const tenantCount = async () => (await adminDb().collection("tenants").get()).size;

describe("submitting an application", () => {
  it("creates a PENDING application keyed by the applicant uid, with an audit entry", async () => {
    const user = await makeUser("user-1");
    await submitApplication(user, input());

    const snap = await adminDb().doc("tenantApplications/user-1").get();
    expect(snap.exists).toBe(true);
    expect(snap.data().status).toBe("PENDING");
    expect(snap.data().applicantUid).toBe("user-1");
    expect(snap.data().submissionCount).toBe(1);

    const audit = await adminDb().collection("platformAuditLogs").where("action", "==", "TENANT_APPLICATION_SUBMITTED").get();
    expect(audit.size).toBe(1);
  });

  it("rejects a second application while one is pending (no duplicates)", async () => {
    const user = await makeUser("user-1");
    await submitApplication(user, input());
    await expect(submitApplication(user, input({ slug: "another-slug" }))).rejects.toMatchObject({
      code: "APPLICATION_EXISTS",
      status: 409,
    });
  });

  it("two simultaneous submissions from one user create exactly one application", async () => {
    const user = await makeUser("user-1");
    const results = await Promise.allSettled([submitApplication(user, input()), submitApplication(user, input())]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const snap = await adminDb().doc("tenantApplications/user-1").get();
    expect(snap.data().submissionCount).toBe(1);
  });

  it("refuses a slug that already belongs to a tenant", async () => {
    await approvedTenant("owner-1", "smart-mobile-hub");
    const other = await makeUser("user-2");
    await expect(submitApplication(other, input())).rejects.toMatchObject({ code: "SLUG_TAKEN" });
  });

  it("refuses users who already belong to a shop", async () => {
    const { user } = await approvedTenant("owner-1", "shop-one");
    await expect(submitApplication(user, input({ slug: "shop-two" }))).rejects.toMatchObject({
      code: "MEMBERSHIP_EXISTS",
    });
  });
});

describe("approving an application", () => {
  it("creates the tenant, owner membership, main branch, index, slug and audit logs together", async () => {
    const user = await makeUser("owner-1", { name: "Ali Khan" });
    await submitApplication(user, input());
    const { tenantId } = await approveApplication(ADMIN_UID, "owner-1");
    const db = adminDb();

    const tenant = (await db.doc(`tenants/${tenantId}`).get()).data();
    expect(tenant.status).toBe("ACTIVE");
    expect(tenant.ownerUid).toBe("owner-1");
    expect(tenant.slug).toBe("smart-mobile-hub");
    expect(tenant.counters.branches).toBe(1);
    expect(tenant.limits.maxBranches).toBe(3);
    expect(tenant.createdFromApplicationId).toBe("owner-1");

    const member = (await db.doc(`tenants/${tenantId}/members/owner-1`).get()).data();
    expect(member.role).toBe("OWNER");
    expect(member.status).toBe("ACTIVE");
    expect(member.allBranches).toBe(true);
    expect(member.displayName).toBe("Ali Khan");

    const branches = await db.collection(`tenants/${tenantId}/branches`).get();
    expect(branches.size).toBe(1);
    expect(branches.docs[0].data().isMain).toBe(true);

    const index = (await db.doc(`userTenants/owner-1/memberships/${tenantId}`).get()).data();
    expect(index.role).toBe("OWNER");
    expect(index.status).toBe("ACTIVE");

    const slug = (await db.doc("tenantSlugs/smart-mobile-hub").get()).data();
    expect(slug.tenantId).toBe(tenantId);

    const application = await getUserApplication("owner-1");
    expect(application.status).toBe("APPROVED");
    expect(application.tenantId).toBe(tenantId);

    const platformAudit = await db.collection("platformAuditLogs").where("action", "==", "TENANT_APPLICATION_APPROVED").get();
    expect(platformAudit.size).toBe(1);
    const tenantAudit = await db.collection(`tenants/${tenantId}/auditLogs`).get();
    expect(tenantAudit.size).toBe(1);
  });

  it("cannot be approved twice (second attempt conflicts, still exactly one tenant)", async () => {
    const user = await makeUser("owner-1");
    await submitApplication(user, input());
    await approveApplication(ADMIN_UID, "owner-1");
    await expect(approveApplication(ADMIN_UID, "owner-1")).rejects.toMatchObject({ code: "ALREADY_DECIDED" });
    expect(await tenantCount()).toBe(1);
  });

  it("two admins approving at the same moment create exactly one tenant", async () => {
    const user = await makeUser("owner-1");
    await submitApplication(user, input());
    const results = await Promise.allSettled([
      approveApplication("admin-a", "owner-1"),
      approveApplication("admin-b", "owner-1"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await tenantCount()).toBe(1);
    const memberships = await adminDb().collection("userTenants/owner-1/memberships").get();
    expect(memberships.size).toBe(1);
  });

  it("refuses unverified or missing applicants and creates nothing", async () => {
    const unverified = await makeUser("owner-1", { verified: false });
    await submitApplication(unverified, input());
    await expect(approveApplication(ADMIN_UID, "owner-1")).rejects.toMatchObject({ code: "APPLICANT_NOT_VERIFIED" });

    await adminAuth().deleteUser("owner-1");
    await expect(approveApplication(ADMIN_UID, "owner-1")).rejects.toMatchObject({ code: "APPLICANT_UNAVAILABLE" });

    expect(await tenantCount()).toBe(0);
    expect((await getUserApplication("owner-1")).status).toBe("PENDING");
  });

  it("returns not-found for unknown ids and refuses path-injection ids", async () => {
    await expect(approveApplication(ADMIN_UID, "does-not-exist")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(approveApplication(ADMIN_UID, "a/b")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(approveApplication(ADMIN_UID, "..")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("when two pending applications want the same slug, the second approval fails and stays pending", async () => {
    const one = await makeUser("owner-1");
    const two = await makeUser("owner-2");
    await submitApplication(one, input());
    await submitApplication(two, input());

    await approveApplication(ADMIN_UID, "owner-1");
    await expect(approveApplication(ADMIN_UID, "owner-2")).rejects.toMatchObject({ code: "SLUG_TAKEN" });

    expect(await tenantCount()).toBe(1);
    expect((await getUserApplication("owner-2")).status).toBe("PENDING");
    const memberships = await adminDb().collection("userTenants/owner-2/memberships").get();
    expect(memberships.size).toBe(0);
  });
});

describe("rejecting an application", () => {
  it("stores the reason, creates no tenant, and allows a corrected resubmission", async () => {
    const user = await makeUser("user-1");
    await submitApplication(user, input());
    await rejectApplication(ADMIN_UID, "user-1", "Phone number could not be verified");

    const rejected = await getUserApplication("user-1");
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("Phone number could not be verified");
    expect(await tenantCount()).toBe(0);

    await submitApplication(user, input({ phone: "+92 321 7654321" }));
    const again = await getUserApplication("user-1");
    expect(again.status).toBe("PENDING");
    expect(again.rejectionReason).toBeNull();
    expect(again.submissionCount).toBe(2);
  });

  it("cannot reject an application that was already decided", async () => {
    const user = await makeUser("user-1");
    await submitApplication(user, input());
    await approveApplication(ADMIN_UID, "user-1");
    await expect(rejectApplication(ADMIN_UID, "user-1", "too late")).rejects.toMatchObject({
      code: "ALREADY_DECIDED",
    });
  });
});

describe("pending list", () => {
  it("contains only pending applications, oldest first", async () => {
    const a = await makeUser("user-a");
    const b = await makeUser("user-b");
    const c = await makeUser("user-c");
    await submitApplication(a, input({ slug: "shop-a", shopName: "Shop A" }));
    await submitApplication(b, input({ slug: "shop-b", shopName: "Shop B" }));
    await submitApplication(c, input({ slug: "shop-c", shopName: "Shop C" }));
    await rejectApplication(ADMIN_UID, "user-b", "not a real shop");

    const pending = await listPendingApplications();
    expect(pending.map((p) => p.id)).toEqual(["user-a", "user-c"]);
    expect(typeof pending[0].createdAt).toBe("string");
  });
});

describe("branches", () => {
  it("enforces the plan's branch limit, including under concurrent requests", async () => {
    const { tenantId } = await approvedTenant("owner-1", "shop-one");
    const ctx = ownerCtx(tenantId, "owner-1");
    const data = { name: "Branch", address: "", phone: "" };

    await createBranch(ctx, { ...data, name: "Second" }); // 2 of 3
    const results = await Promise.allSettled([
      createBranch(ctx, { ...data, name: "Third A" }),
      createBranch(ctx, { ...data, name: "Third B" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected").reason.code).toBe("BRANCH_LIMIT_REACHED");

    const tenant = (await adminDb().doc(`tenants/${tenantId}`).get()).data();
    expect(tenant.counters.branches).toBe(3);
    expect((await adminDb().collection(`tenants/${tenantId}/branches`).get()).size).toBe(3);
    await expect(createBranch(ctx, { ...data, name: "Fourth" })).rejects.toMatchObject({
      code: "BRANCH_LIMIT_REACHED",
      status: 409,
    });
  });

  it("updates a branch and writes an audit entry", async () => {
    const { tenantId } = await approvedTenant("owner-1", "shop-one");
    const ctx = ownerCtx(tenantId, "owner-1");
    const { id } = await createBranch(ctx, { name: "Second", address: "", phone: "" });

    await updateBranch(ctx, id, { name: "Second Branch", address: "Mall Road", phone: "" });
    const branch = (await adminDb().doc(`tenants/${tenantId}/branches/${id}`).get()).data();
    expect(branch.name).toBe("Second Branch");
    expect(branch.address).toBe("Mall Road");

    const audit = await adminDb().collection(`tenants/${tenantId}/auditLogs`).where("action", "==", "BRANCH_UPDATED").get();
    expect(audit.size).toBe(1);
  });

  it("cannot touch another tenant's branch (tenant isolation at the service layer)", async () => {
    const a = await approvedTenant("owner-a", "shop-a");
    const b = await approvedTenant("owner-b", "shop-b");
    const branchOfB = (await adminDb().collection(`tenants/${b.tenantId}/branches`).get()).docs[0];

    await expect(
      updateBranch(ownerCtx(a.tenantId, "owner-a"), branchOfB.id, { name: "Hacked", address: "", phone: "" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const unchanged = (await adminDb().doc(`tenants/${b.tenantId}/branches/${branchOfB.id}`).get()).data();
    expect(unchanged.name).toBe("Main Branch");
  });

  it("lists only the branches a limited member is assigned to", async () => {
    const { tenantId } = await approvedTenant("owner-1", "shop-one");
    const owner = ownerCtx(tenantId, "owner-1");
    const { id } = await createBranch(owner, { name: "Second", address: "", phone: "" });

    expect((await listBranches(owner)).length).toBe(2);

    const cashier = { tenantId, user: { uid: "cashier-1" }, allBranches: false, branchIds: [id] };
    const visible = await listBranches(cashier);
    expect(visible.map((b) => b.id)).toEqual([id]);

    const nobody = { tenantId, user: { uid: "x" }, allBranches: false, branchIds: [] };
    expect(await listBranches(nobody)).toEqual([]);
  });
});
