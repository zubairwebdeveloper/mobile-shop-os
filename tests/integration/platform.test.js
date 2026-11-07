/**
 * Integration tests for Phase 4 services against the Firebase EMULATORS (real Admin SDK).
 * Run with:  npm run test:integration
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { createBranch } from "@/lib/tenant/branches";
import { approveApplication, submitApplication } from "@/lib/tenant/onboarding";
import { listPlatformAuditLogs } from "@/lib/platform/audit";
import { createPlan, listPlans, updatePlan } from "@/lib/platform/plans";
import { getPlatformStats } from "@/lib/platform/stats";
import { getTenantDetail, listTenants, setTenantStatus, updateTenantSubscription } from "@/lib/platform/tenants";
import { getTenantStatus } from "@/lib/platform/admin";

const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID || "demo-msos";
const ADMIN = "platform-admin";

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Run these tests through the emulators: npm run test:integration");
  }
});

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
});

async function makeTenant(uid, slug) {
  const email = `${uid}@example.test`;
  await adminAuth().createUser({ uid, email, emailVerified: true, displayName: "Owner", password: "Test#12345" });
  await submitApplication(
    { uid, email },
    { shopName: `Shop ${slug}`, slug, ownerName: "Owner", phone: "+92 300 1234567", city: "Lahore", address: "Hall Road, Lahore", expectedBranches: 1 }
  );
  const { tenantId } = await approveApplication(ADMIN, uid);
  return tenantId;
}

const planInput = (id, o = {}) => ({
  id,
  name: id,
  description: "",
  priceMonthlyPkr: "",
  maxBranches: 3,
  maxEmployees: 10,
  aiRequestsPerMonth: 0,
  features: "",
  visibility: "HIDDEN",
  status: "ACTIVE",
  sortOrder: 0,
  ...o,
});
const sub = (planId, o = {}) => ({ planId, status: "ACTIVE", renewsAt: "", note: "", ...o });

describe("suspend / reactivate", () => {
  it("suspends, records audit in both logs, and getTenantStatus reflects it", async () => {
    const t = await makeTenant("u1", "shop-one");
    await setTenantStatus(ADMIN, t, "SUSPEND", "Unpaid invoice");
    expect(await getTenantStatus(t)).toBe("SUSPENDED");
    const detail = await getTenantDetail(t);
    expect(detail.suspension.reason).toBe("Unpaid invoice");
    const platform = await adminDb().collection("platformAuditLogs").where("action", "==", "TENANT_SUSPENDED").get();
    const tenant = await adminDb().collection(`tenants/${t}/auditLogs`).where("action", "==", "TENANT_SUSPENDED").get();
    expect(platform.size).toBe(1);
    expect(tenant.size).toBe(1);
  });

  it("reactivates and clears the suspension fields", async () => {
    const t = await makeTenant("u1", "shop-one");
    await setTenantStatus(ADMIN, t, "SUSPEND", "Reason");
    await setTenantStatus(ADMIN, t, "REACTIVATE");
    expect(await getTenantStatus(t)).toBe("ACTIVE");
    const data = (await adminDb().doc(`tenants/${t}`).get()).data();
    expect(data.suspensionReason).toBeNull();
  });

  it("rejects invalid transitions", async () => {
    const t = await makeTenant("u1", "shop-one");
    await expect(setTenantStatus(ADMIN, t, "REACTIVATE")).rejects.toMatchObject({ code: "INVALID_STATE", status: 409 });
    await setTenantStatus(ADMIN, t, "SUSPEND", "Reason");
    await expect(setTenantStatus(ADMIN, t, "SUSPEND", "Again")).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("two simultaneous suspensions succeed exactly once", async () => {
    const t = await makeTenant("u1", "shop-one");
    const results = await Promise.allSettled([
      setTenantStatus(ADMIN, t, "SUSPEND", "First"),
      setTenantStatus(ADMIN, t, "SUSPEND", "Second"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const logs = await adminDb().collection("platformAuditLogs").where("action", "==", "TENANT_SUSPENDED").get();
    expect(logs.size).toBe(1);
  });

  it("unknown or unsafe shop ids are 404", async () => {
    await expect(setTenantStatus(ADMIN, "missing", "SUSPEND", "Reason")).rejects.toMatchObject({ status: 404 });
    await expect(setTenantStatus(ADMIN, "../x", "SUSPEND", "Reason")).rejects.toMatchObject({ status: 404 });
    expect(await getTenantDetail("missing")).toBeNull();
    expect(await getTenantDetail("a/b")).toBeNull();
  });
});

describe("plans", () => {
  it("creates, lists and updates a plan with audit entries", async () => {
    await createPlan(ADMIN, planInput("starter", { priceMonthlyPkr: "1500" }));
    let plans = await listPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0].priceMonthly).toBe(150000);
    await updatePlan(ADMIN, "starter", planInput("starter", { name: "Starter v2", maxBranches: 5 }));
    plans = await listPlans();
    expect(plans[0].name).toBe("Starter v2");
    expect(plans[0].limits.maxBranches).toBe(5);
    const actions = (await adminDb().collection("platformAuditLogs").get()).docs.map((d) => d.data().action).sort();
    expect(actions).toContain("PLAN_CREATED");
    expect(actions).toContain("PLAN_UPDATED");
  });

  it("rejects a duplicate id and updating a missing plan", async () => {
    await createPlan(ADMIN, planInput("starter"));
    await expect(createPlan(ADMIN, planInput("starter"))).rejects.toMatchObject({ code: "PLAN_EXISTS", status: 409 });
    await expect(updatePlan(ADMIN, "nope", planInput("nope"))).rejects.toMatchObject({ status: 404 });
  });

  it("saving a placeholder plan clears isPlaceholder", async () => {
    await adminDb().doc("platformPlans/starter").set({ name: "Starter", isPlaceholder: true, status: "ACTIVE", limits: {}, sortOrder: 0 });
    await updatePlan(ADMIN, "starter", planInput("starter"));
    expect((await listPlans())[0].isPlaceholder).toBe(false);
  });
});

describe("tenant subscription", () => {
  it("assigns a plan: snapshot limits, subscription fields, history and audit", async () => {
    const t = await makeTenant("u1", "shop-one");
    await createPlan(ADMIN, planInput("pro", { maxBranches: 7, maxEmployees: 40 }));
    await updateTenantSubscription(ADMIN, t, sub("pro", { renewsAt: "2026-12-01", note: "Paid cash" }));

    const data = (await adminDb().doc(`tenants/${t}`).get()).data();
    expect(data.planId).toBe("pro");
    expect(data.limits.maxBranches).toBe(7);
    expect(data.subscription.status).toBe("ACTIVE");
    expect(data.subscription.renewsAt.toDate().toISOString().slice(0, 10)).toBe("2026-12-01");

    const history = await adminDb().collection(`tenants/${t}/subscriptionHistory`).get();
    expect(history.size).toBe(1);
    expect(history.docs[0].data()).toMatchObject({ toPlanId: "pro", note: "Paid cash", changedBy: ADMIN });
  });

  it("editing a plan does not change existing shops until the subscription is re-saved", async () => {
    const t = await makeTenant("u1", "shop-one");
    await createPlan(ADMIN, planInput("pro", { maxBranches: 5 }));
    await updateTenantSubscription(ADMIN, t, sub("pro"));
    await updatePlan(ADMIN, "pro", planInput("pro", { maxBranches: 9 }));
    expect((await adminDb().doc(`tenants/${t}`).get()).data().limits.maxBranches).toBe(5);
    await updateTenantSubscription(ADMIN, t, sub("pro"));
    expect((await adminDb().doc(`tenants/${t}`).get()).data().limits.maxBranches).toBe(9);
  });

  it("refuses an archived plan and an unknown plan", async () => {
    const t = await makeTenant("u1", "shop-one");
    await createPlan(ADMIN, planInput("old", { status: "ARCHIVED" }));
    await expect(updateTenantSubscription(ADMIN, t, sub("old"))).rejects.toMatchObject({ code: "PLAN_UNAVAILABLE", status: 409 });
    await expect(updateTenantSubscription(ADMIN, t, sub("ghost"))).rejects.toMatchObject({ status: 404 });
  });

  it("blocks a downgrade below current branch usage and leaves the shop unchanged", async () => {
    const t = await makeTenant("u1", "shop-one"); // starts with 1 main branch
    await createPlan(ADMIN, planInput("big", { maxBranches: 5 }));
    await createPlan(ADMIN, planInput("tiny", { maxBranches: 1 }));
    await updateTenantSubscription(ADMIN, t, sub("big"));
    const ctx = { tenantId: t, user: { uid: "u1" }, allBranches: true, branchIds: [] };
    await createBranch(ctx, { name: "Second", address: "", phone: "" });
    await expect(updateTenantSubscription(ADMIN, t, sub("tiny"))).rejects.toMatchObject({ code: "DOWNGRADE_BLOCKED", status: 409 });
    expect((await adminDb().doc(`tenants/${t}`).get()).data().planId).toBe("big");
    expect((await adminDb().collection(`tenants/${t}/subscriptionHistory`).get()).size).toBe(1);
  });

  it("unchanged plan without a plan record only updates status/renewal", async () => {
    const t = await makeTenant("u1", "shop-one");
    const before = (await adminDb().doc(`tenants/${t}`).get()).data();
    await updateTenantSubscription(ADMIN, t, sub(before.planId, { status: "TRIAL" }));
    const after = (await adminDb().doc(`tenants/${t}`).get()).data();
    expect(after.limits).toEqual(before.limits);
    expect(after.subscription.status).toBe("TRIAL");
  });
});

describe("stats and listing", () => {
  it("counts shops, statuses, applications, users and plans", async () => {
    const a = await makeTenant("u1", "shop-one");
    await makeTenant("u2", "shop-two");
    await setTenantStatus(ADMIN, a, "SUSPEND", "Reason");
    await createPlan(ADMIN, planInput("starter"));
    const stats = await getPlatformStats();
    expect(stats).toMatchObject({ totalTenants: 2, activeTenants: 1, suspendedTenants: 1, pendingApplications: 0, plans: 1 });
    const list = await listTenants();
    expect(list).toHaveLength(2);
    expect(list.every((t) => typeof t.branchesUsed === "number")).toBe(true);
  });
});

describe("audit log pagination", () => {
  it("pages newest-first without duplicates or gaps", async () => {
    for (let i = 0; i < 7; i += 1) {
      await createPlan(ADMIN, planInput(`plan-${i}`));
    }
    const seen = [];
    let cursor;
    let pages = 0;
    do {
      const page = await listPlatformAuditLogs({ limit: 3, cursor });
      seen.push(...page.entries.map((e) => e.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 10);
    const all = (await adminDb().collection("platformAuditLogs").get()).docs.map((d) => d.id);
    expect(seen).toHaveLength(all.length);
    expect(new Set(seen).size).toBe(all.length);
    expect(pages).toBe(Math.ceil(all.length / 3));
  });

  it("ignores a bogus cursor", async () => {
    await createPlan(ADMIN, planInput("starter"));
    const page = await listPlatformAuditLogs({ limit: 5, cursor: "../bad" });
    expect(page.entries.length).toBeGreaterThan(0);
  });
});
