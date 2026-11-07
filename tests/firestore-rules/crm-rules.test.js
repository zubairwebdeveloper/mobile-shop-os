/** Rules for Phase 9 data. Run with the emulator:  npm run test:rules */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-msos-crm-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => testEnv?.cleanup());

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "tenants/T1"), { name: "T1", status: "ACTIVE" });
    const m = (uid, role) => setDoc(doc(db, `tenants/T1/members/${uid}`), { role, status: "ACTIVE", allBranches: true, branchIds: [] });
    await m("owner1", "OWNER");
    await m("mgr1", "MANAGER");
    await m("cash1", "CASHIER");
    await m("tech1", "TECHNICIAN");
    await m("acct1", "ACCOUNTANT");
    await setDoc(doc(db, "tenants/T2"), { name: "T2", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/T2/members/owner2"), { role: "OWNER", status: "ACTIVE", allBranches: true, branchIds: [] });
    await setDoc(doc(db, "tenants/T1/customers/c1"), { name: "Ali", phone: "0300", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/T1/customers/c1/private/profile"), { email: "ali@example.test", address: "Lahore", notes: "pays late" });
    await setDoc(doc(db, "tenants/T1/customerPhones/92300"), { customerId: "c1" });
    await setDoc(doc(db, "tenants/T1/warranties/w1"), { branchId: "A", expiryDate: "2027-01-01" });
    await setDoc(doc(db, "tenants/T1/repairJobs/r1"), { branchId: "A", status: "RECEIVED" });
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();

describe("customers", () => {
  it("front-desk roles read the public profile; an accountant cannot", async () => {
    for (const uid of ["owner1", "mgr1", "cash1", "tech1"]) await assertSucceeds(getDoc(doc(as(uid), "tenants/T1/customers/c1")));
    await assertFails(getDoc(doc(as("acct1"), "tenants/T1/customers/c1")));
  });
  it("private details (email, address, notes) are for owner and manager only", async () => {
    await assertSucceeds(getDoc(doc(as("owner1"), "tenants/T1/customers/c1/private/profile")));
    await assertSucceeds(getDoc(doc(as("mgr1"), "tenants/T1/customers/c1/private/profile")));
    await assertFails(getDoc(doc(as("cash1"), "tenants/T1/customers/c1/private/profile")));
    await assertFails(getDoc(doc(as("tech1"), "tenants/T1/customers/c1/private/profile")));
  });
  it("another shop and any client write are refused", async () => {
    await assertFails(getDoc(doc(as("owner2"), "tenants/T1/customers/c1")));
    await assertFails(updateDoc(doc(as("owner1"), "tenants/T1/customers/c1"), { vip: true }));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/customers/c2"), { name: "x" }));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/customers/c1/private/profile"), { notes: "x" }));
  });
});

describe("server-only collections", () => {
  it("phone claims and warranties are closed to every client (the server reads them)", async () => {
    for (const path of ["customerPhones/92300", "warranties/w1"]) {
      await assertFails(getDoc(doc(as("owner1"), `tenants/T1/${path}`)));
    }
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/warranties/w2"), { x: 1 }));
  });
});

// Corrected in Phase 10: the Phase 2 rules DO let front-desk roles read repair jobs of their branch (never write them).
describe("repair jobs", () => {
  it("owner, manager, cashier and technician can read a job in an allowed branch; an accountant cannot", async () => {
    for (const uid of ["owner1", "mgr1", "cash1", "tech1"]) await assertSucceeds(getDoc(doc(as(uid), "tenants/T1/repairJobs/r1")));
    await assertFails(getDoc(doc(as("acct1"), "tenants/T1/repairJobs/r1")));
  });
  it("another shop and every client write are refused", async () => {
    await assertFails(getDoc(doc(as("owner2"), "tenants/T1/repairJobs/r1")));
    await assertFails(updateDoc(doc(as("owner1"), "tenants/T1/repairJobs/r1"), { status: "DELIVERED" }));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/repairJobs/r2"), { branchId: "A" }));
  });
});
