/** Rules for Phase 4 data. Run with the emulator:  npm run test:rules */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-msos-platform-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => testEnv?.cleanup());

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "platformAdmins/admin1"), { level: "SUPER_ADMIN" });
    await setDoc(doc(db, "platformPlans/pub"), { name: "Public", isPublic: true, status: "ACTIVE" });
    await setDoc(doc(db, "platformPlans/hidden"), { name: "Hidden", isPublic: false, status: "ACTIVE" });
    await setDoc(doc(db, "tenants/T1"), { name: "Shop", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/T1/members/owner1"), { role: "OWNER", status: "ACTIVE", branchIds: [] });
    await setDoc(doc(db, "tenants/T1/subscriptionHistory/h1"), { toPlanId: "pub" });
    await setDoc(doc(db, "tenants/T1/auditLogs/a1"), { action: "X" });
    await setDoc(doc(db, "platformAuditLogs/p1"), { action: "TENANT_SUSPENDED" });
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

describe("plans", () => {
  it("anyone can read a public plan", () => assertSucceeds(getDoc(doc(anon(), "platformPlans/pub"))));
  it("a hidden plan is not readable by a shop owner or anonymous users", async () => {
    await assertFails(getDoc(doc(as("owner1"), "platformPlans/hidden")));
    await assertFails(getDoc(doc(anon(), "platformPlans/hidden")));
  });
  it("platform admins can read hidden plans but nobody can write from the client", async () => {
    await assertSucceeds(getDoc(doc(as("admin1"), "platformPlans/hidden")));
    await assertFails(updateDoc(doc(as("admin1"), "platformPlans/hidden"), { name: "x" }));
    await assertFails(setDoc(doc(as("admin1"), "platformPlans/new"), { name: "x" }));
  });
});

describe("subscription history and audit", () => {
  it("subscriptionHistory is closed to clients, including the owner and platform admin", async () => {
    await assertFails(getDoc(doc(as("owner1"), "tenants/T1/subscriptionHistory/h1")));
    await assertFails(getDoc(doc(as("admin1"), "tenants/T1/subscriptionHistory/h1")));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/subscriptionHistory/h2"), { a: 1 }));
  });
  it("platformAuditLogs are readable by admins only and never writable", async () => {
    await assertSucceeds(getDocs(collection(as("admin1"), "platformAuditLogs")));
    await assertFails(getDocs(collection(as("owner1"), "platformAuditLogs")));
    await assertFails(setDoc(doc(as("admin1"), "platformAuditLogs/p2"), { a: 1 }));
  });
  it("tenant status cannot be changed from the client", async () => {
    await assertFails(updateDoc(doc(as("owner1"), "tenants/T1"), { status: "SUSPENDED" }));
    await assertFails(updateDoc(doc(as("admin1"), "tenants/T1"), { status: "SUSPENDED" }));
  });
});
