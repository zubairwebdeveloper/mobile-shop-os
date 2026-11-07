/** Rules for Phase 7 data. Run with the emulator:  npm run test:rules */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";

let testEnv;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-msos-inventory-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => testEnv?.cleanup());

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "tenants/T1"), { name: "T1", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/T2"), { name: "T2", status: "ACTIVE" });
    const m = (uid, role, scope) => setDoc(doc(db, `tenants/T1/members/${uid}`), { role, status: "ACTIVE", allBranches: scope === "ALL", branchIds: scope === "ALL" ? [] : [scope] });
    await m("owner1", "OWNER", "ALL");
    await m("mgrA", "MANAGER", "A");
    await m("acctA", "ACCOUNTANT", "A");
    await m("cashA", "CASHIER", "A");
    await setDoc(doc(db, "tenants/T2/members/owner2"), { role: "OWNER", status: "ACTIVE", allBranches: true, branchIds: [] });
    await setDoc(doc(db, "tenants/T1/inventory/v1_A"), { branchId: "A", quantity: 3 });
    await setDoc(doc(db, "tenants/T1/inventory/v1_B"), { branchId: "B", quantity: 9 });
    await setDoc(doc(db, "tenants/T1/stockMovements/m1"), { branchId: "B", quantityChange: 9 });
    await setDoc(doc(db, "tenants/T1/purchases/p1"), { branchId: "A", status: "ORDERED" });
    await setDoc(doc(db, "tenants/T1/purchases/p2"), { branchId: "B", status: "ORDERED" });
    await setDoc(doc(db, "tenants/T1/suppliers/s1"), { name: "Sup" });
    await setDoc(doc(db, "tenants/T1/transfers/t1"), { fromBranchId: "A", toBranchId: "B" });
    await setDoc(doc(db, "tenants/T1/counters/purchases"), { next: 5 });
    await setDoc(doc(db, "tenants/T1/purchases/p1/receipts/k1"), { actorUid: "x" });
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();

describe("inventory and movements are branch-scoped, read-only", () => {
  it("a scoped member reads her branch only", async () => {
    await assertSucceeds(getDoc(doc(as("cashA"), "tenants/T1/inventory/v1_A")));
    await assertFails(getDoc(doc(as("cashA"), "tenants/T1/inventory/v1_B")));
    await assertFails(getDoc(doc(as("mgrA"), "tenants/T1/stockMovements/m1")));
  });
  it("branch-filtered lists work, unfiltered are refused for scoped members", async () => {
    await assertSucceeds(getDocs(query(collection(as("cashA"), "tenants/T1/inventory"), where("branchId", "==", "A"))));
    await assertFails(getDocs(collection(as("cashA"), "tenants/T1/inventory")));
  });
  it("another shop and clients writing are refused", async () => {
    await assertFails(getDoc(doc(as("owner2"), "tenants/T1/inventory/v1_A")));
    await assertFails(updateDoc(doc(as("owner1"), "tenants/T1/inventory/v1_A"), { quantity: 999 }));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/stockMovements/m2"), { branchId: "A" }));
  });
});

describe("purchasing", () => {
  it("owner, manager and accountant read their branch's purchases; a cashier cannot", async () => {
    await assertSucceeds(getDoc(doc(as("mgrA"), "tenants/T1/purchases/p1")));
    await assertSucceeds(getDoc(doc(as("acctA"), "tenants/T1/purchases/p1")));
    await assertFails(getDoc(doc(as("cashA"), "tenants/T1/purchases/p1")));
    await assertFails(getDoc(doc(as("mgrA"), "tenants/T1/purchases/p2")));
    await assertSucceeds(getDoc(doc(as("owner1"), "tenants/T1/purchases/p2")));
  });
  it("suppliers are for owner, manager and accountant only", async () => {
    await assertSucceeds(getDoc(doc(as("acctA"), "tenants/T1/suppliers/s1")));
    await assertFails(getDoc(doc(as("cashA"), "tenants/T1/suppliers/s1")));
  });
  it("writes are refused everywhere", async () => {
    await assertFails(updateDoc(doc(as("owner1"), "tenants/T1/purchases/p1"), { status: "RECEIVED" }));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/suppliers/s2"), { name: "x" }));
  });
});

describe("server-only collections", () => {
  it("transfers, counters and receipts are closed to clients", async () => {
    await assertFails(getDoc(doc(as("owner1"), "tenants/T1/transfers/t1")));
    await assertFails(getDoc(doc(as("owner1"), "tenants/T1/counters/purchases")));
    await assertFails(getDoc(doc(as("owner1"), "tenants/T1/purchases/p1/receipts/k1")));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/counters/purchases"), { next: 1 }));
  });
});
