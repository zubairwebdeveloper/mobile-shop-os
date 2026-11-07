/**
 * Firestore rules tests. Run with the emulator:  npm run test:rules
 * (firebase emulators:exec sets FIRESTORE_EMULATOR_HOST, which the test environment reads).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, deleteDoc, where } from "firebase/firestore";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-msos-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

const member = (role, extra = {}) => ({
  role,
  status: "ACTIVE",
  allBranches: false,
  branchIds: [],
  ...extra,
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // Tenants: A and B active, S suspended
    await setDoc(doc(db, "tenants/A"), { name: "Shop A", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/B"), { name: "Shop B", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/S"), { name: "Suspended", status: "SUSPENDED" });

    // Members of A
    await setDoc(doc(db, "tenants/A/members/ownerA"), member("OWNER", { allBranches: true }));
    await setDoc(doc(db, "tenants/A/members/managerA"), member("MANAGER", { allBranches: true }));
    await setDoc(doc(db, "tenants/A/members/cashierA1"), member("CASHIER", { branchIds: ["A1"] }));
    await setDoc(doc(db, "tenants/A/members/techA"), member("TECHNICIAN", { branchIds: ["A1"] }));
    await setDoc(doc(db, "tenants/A/members/acctA"), member("ACCOUNTANT", { allBranches: true }));
    await setDoc(doc(db, "tenants/A/members/removedA"), member("CASHIER", { branchIds: ["A1"], status: "REMOVED" }));
    // Members of B and S
    await setDoc(doc(db, "tenants/B/members/ownerB"), member("OWNER", { allBranches: true }));
    await setDoc(doc(db, "tenants/S/members/ownerS"), member("OWNER", { allBranches: true }));

    // Data in A
    await setDoc(doc(db, "tenants/A/products/p1"), { name: "Phone X" });
    await setDoc(doc(db, "tenants/A/sales/s1"), { branchId: "A1", total: 1000 });
    await setDoc(doc(db, "tenants/A/sales/s2"), { branchId: "A2", total: 2000 });
    await setDoc(doc(db, "tenants/A/transactions/t1"), { branchId: "A1", amount: 1000 });
    await setDoc(doc(db, "tenants/A/purchases/pu1"), { branchId: "A1" });
    await setDoc(doc(db, "tenants/A/customers/c1"), { name: "Ali" });
    await setDoc(doc(db, "tenants/A/customers/c1/private/profile"), { cnic: "redacted-test-value" });
    await setDoc(doc(db, "tenants/A/employees/e1"), { name: "Staff" });
    await setDoc(doc(db, "tenants/A/auditLogs/l1"), { action: "TEST" });
    await setDoc(doc(db, "tenants/A/installmentPlans/i1"), { branchId: "A1" }); // no rule yet
    // Data in B and S
    await setDoc(doc(db, "tenants/B/sales/sB1"), { branchId: "B1", total: 5 });
    await setDoc(doc(db, "tenants/S/sales/sS1"), { branchId: "S1", total: 5 });

    // Platform
    await setDoc(doc(db, "platformAdmins/admin1"), { level: "SUPER_ADMIN" });
    await setDoc(doc(db, "platformAuditLogs/pl1"), { action: "TEST" });
    await setDoc(doc(db, "platformPlans/starter"), { name: "Starter", isPublic: true });
    await setDoc(doc(db, "platformPlans/internal"), { name: "Internal", isPublic: false });
    await setDoc(doc(db, "userTenants/ownerA/memberships/A"), { status: "ACTIVE" });
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

describe("unauthenticated users", () => {
  it("cannot read tenant data", async () => {
    await assertFails(getDoc(doc(anon(), "tenants/A")));
    await assertFails(getDoc(doc(anon(), "tenants/A/products/p1")));
    await assertFails(getDoc(doc(anon(), "tenants/A/sales/s1")));
  });

  it("can read only public plans", async () => {
    await assertSucceeds(getDoc(doc(anon(), "platformPlans/starter")));
    await assertFails(getDoc(doc(anon(), "platformPlans/internal")));
  });
});

describe("cross-tenant isolation", () => {
  it("owner of A cannot read tenant B documents", async () => {
    await assertFails(getDoc(doc(as("ownerA"), "tenants/B")));
    await assertFails(getDoc(doc(as("ownerA"), "tenants/B/sales/sB1")));
    await assertFails(getDocs(collection(as("ownerA"), "tenants/B/sales")));
  });

  it("owner of B cannot read tenant A documents", async () => {
    await assertFails(getDoc(doc(as("ownerB"), "tenants/A/sales/s1")));
    await assertFails(getDoc(doc(as("ownerB"), "tenants/A/customers/c1/private/profile")));
  });

  it("a user with no membership anywhere reads nothing", async () => {
    await assertFails(getDoc(doc(as("stranger"), "tenants/A/products/p1")));
    await assertFails(getDoc(doc(as("stranger"), "tenants/A")));
  });

  it("cannot read another tenant's membership list", async () => {
    await assertFails(getDocs(collection(as("ownerB"), "tenants/A/members")));
  });
});

describe("membership and tenant status", () => {
  it("active member reads own tenant", async () => {
    await assertSucceeds(getDoc(doc(as("cashierA1"), "tenants/A")));
    await assertSucceeds(getDoc(doc(as("cashierA1"), "tenants/A/products/p1")));
  });

  it("REMOVED member loses access", async () => {
    await assertFails(getDoc(doc(as("removedA"), "tenants/A/products/p1")));
    await assertFails(getDoc(doc(as("removedA"), "tenants/A/sales/s1")));
  });

  it("suspended tenant blocks even its owner", async () => {
    await assertFails(getDoc(doc(as("ownerS"), "tenants/S")));
    await assertFails(getDoc(doc(as("ownerS"), "tenants/S/sales/sS1")));
  });

  it("a member can read their own membership document", async () => {
    await assertSucceeds(getDoc(doc(as("cashierA1"), "tenants/A/members/cashierA1")));
    await assertFails(getDoc(doc(as("cashierA1"), "tenants/A/members/ownerA")));
  });
});

describe("role permissions", () => {
  it("CASHIER reads sales but not finance, purchases, employees or private customer data", async () => {
    await assertSucceeds(getDoc(doc(as("cashierA1"), "tenants/A/sales/s1")));
    await assertFails(getDoc(doc(as("cashierA1"), "tenants/A/transactions/t1")));
    await assertFails(getDoc(doc(as("cashierA1"), "tenants/A/purchases/pu1")));
    await assertFails(getDoc(doc(as("cashierA1"), "tenants/A/employees/e1")));
    await assertFails(getDoc(doc(as("cashierA1"), "tenants/A/customers/c1/private/profile")));
  });

  it("TECHNICIAN cannot read sales or finance", async () => {
    await assertFails(getDoc(doc(as("techA"), "tenants/A/sales/s1")));
    await assertFails(getDoc(doc(as("techA"), "tenants/A/transactions/t1")));
    await assertSucceeds(getDoc(doc(as("techA"), "tenants/A/customers/c1")));
  });

  it("ACCOUNTANT reads sales, purchases and finance; not customers private data", async () => {
    await assertSucceeds(getDoc(doc(as("acctA"), "tenants/A/sales/s1")));
    await assertSucceeds(getDoc(doc(as("acctA"), "tenants/A/purchases/pu1")));
    await assertSucceeds(getDoc(doc(as("acctA"), "tenants/A/transactions/t1")));
    await assertFails(getDoc(doc(as("acctA"), "tenants/A/customers/c1/private/profile")));
  });

  it("MANAGER reads private customer data and employees but not the audit log", async () => {
    await assertSucceeds(getDoc(doc(as("managerA"), "tenants/A/customers/c1/private/profile")));
    await assertSucceeds(getDoc(doc(as("managerA"), "tenants/A/employees/e1")));
    await assertFails(getDoc(doc(as("managerA"), "tenants/A/auditLogs/l1")));
  });

  it("only OWNER reads the audit log", async () => {
    await assertSucceeds(getDoc(doc(as("ownerA"), "tenants/A/auditLogs/l1")));
  });
});

describe("branch isolation", () => {
  it("CASHIER of branch A1 reads A1 sales but not A2 sales", async () => {
    await assertSucceeds(getDoc(doc(as("cashierA1"), "tenants/A/sales/s1")));
    await assertFails(getDoc(doc(as("cashierA1"), "tenants/A/sales/s2")));
  });

  it("branch-scoped list query succeeds only when filtered to an allowed branch", async () => {
    const sales = collection(as("cashierA1"), "tenants/A/sales");
    await assertSucceeds(getDocs(query(sales, where("branchId", "==", "A1"))));
    await assertFails(getDocs(query(sales, where("branchId", "==", "A2"))));
    await assertFails(getDocs(sales)); // unfiltered list could return A2 documents
  });

  it("allBranches roles read every branch", async () => {
    await assertSucceeds(getDoc(doc(as("ownerA"), "tenants/A/sales/s2")));
    await assertSucceeds(getDoc(doc(as("acctA"), "tenants/A/sales/s2")));
  });
});

describe("client writes are always denied", () => {
  it("even the OWNER cannot write business data from the client", async () => {
    const db = as("ownerA");
    await assertFails(setDoc(doc(db, "tenants/A/sales/newSale"), { branchId: "A1", total: 1 }));
    await assertFails(updateDoc(doc(db, "tenants/A/sales/s1"), { total: 1 }));
    await assertFails(deleteDoc(doc(db, "tenants/A/sales/s1")));
    await assertFails(setDoc(doc(db, "tenants/A/auditLogs/forged"), { action: "FORGED" }));
    await assertFails(updateDoc(doc(db, "tenants/A"), { status: "SUSPENDED" }));
  });

  it("members cannot change their own role or branches", async () => {
    await assertFails(updateDoc(doc(as("cashierA1"), "tenants/A/members/cashierA1"), { role: "OWNER" }));
    await assertFails(updateDoc(doc(as("cashierA1"), "tenants/A/members/cashierA1"), { allBranches: true }));
  });

  it("users cannot make themselves platform admin", async () => {
    await assertFails(setDoc(doc(as("cashierA1"), "platformAdmins/cashierA1"), { level: "SUPER_ADMIN" }));
    await assertFails(setDoc(doc(as("stranger"), "platformAdmins/stranger"), { level: "SUPER_ADMIN" }));
  });

  it("users cannot write their own userTenants index", async () => {
    await assertFails(setDoc(doc(as("stranger"), "userTenants/stranger/memberships/A"), { status: "ACTIVE" }));
  });
});

describe("platform data", () => {
  it("platform admin reads platform audit logs; others cannot", async () => {
    await assertSucceeds(getDoc(doc(as("admin1"), "platformAuditLogs/pl1")));
    await assertFails(getDoc(doc(as("ownerA"), "platformAuditLogs/pl1")));
  });

  it("platform admin status does NOT grant access to tenant business data", async () => {
    await assertFails(getDoc(doc(as("admin1"), "tenants/A/sales/s1")));
  });

  it("users read only their own userTenants index", async () => {
    await assertSucceeds(getDoc(doc(as("ownerA"), "userTenants/ownerA/memberships/A")));
    await assertFails(getDoc(doc(as("ownerB"), "userTenants/ownerA/memberships/A")));
  });

  it("non-public plans are readable only by platform admins", async () => {
    await assertFails(getDoc(doc(as("ownerA"), "platformPlans/internal")));
    await assertSucceeds(getDoc(doc(as("admin1"), "platformPlans/internal")));
  });
});

describe("default deny", () => {
  it("collections without a rule yet are denied to everyone, including the owner", async () => {
    await assertFails(getDoc(doc(as("ownerA"), "tenants/A/installmentPlans/i1")));
  });

  it("unknown top-level collections are denied", async () => {
    await assertFails(getDoc(doc(as("ownerA"), "somethingElse/x")));
  });
});
