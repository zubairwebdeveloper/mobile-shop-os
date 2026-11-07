/** Rules for Phase 10 data. Run with the emulator:  npm run test:rules */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";

let testEnv;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-msos-finance-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => testEnv?.cleanup());

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "tenants/T1"), { name: "T1", status: "ACTIVE" });
    const m = (uid, role, scope) => setDoc(doc(db, `tenants/T1/members/${uid}`), { role, status: "ACTIVE", allBranches: scope === "ALL", branchIds: scope === "ALL" ? [] : [scope] });
    await m("owner1", "OWNER", "ALL");
    await m("acctA", "ACCOUNTANT", "A");
    await m("cashA", "CASHIER", "A");
    await setDoc(doc(db, "tenants/T1/expenses/eA"), { branchId: "A", amount: 100 });
    await setDoc(doc(db, "tenants/T1/expenses/eB"), { branchId: "B", amount: 100 });
    for (const path of ["installments/s1", "payments/p1", "supplierPayments/sp1", "reconciliations/r1", "repairCosts/r1", "saleCosts/s1"]) {
      await setDoc(doc(db, `tenants/T1/${path}`), { branchId: "A" });
    }
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();

describe("expenses", () => {
  it("owner and accountant read expenses of their branch; a cashier cannot", async () => {
    await assertSucceeds(getDoc(doc(as("acctA"), "tenants/T1/expenses/eA")));
    await assertFails(getDoc(doc(as("acctA"), "tenants/T1/expenses/eB")));
    await assertSucceeds(getDoc(doc(as("owner1"), "tenants/T1/expenses/eB")));
    await assertFails(getDoc(doc(as("cashA"), "tenants/T1/expenses/eA")));
  });
  it("no client can write or void an expense", async () => {
    await assertFails(updateDoc(doc(as("owner1"), "tenants/T1/expenses/eA"), { status: "VOIDED" }));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/expenses/new"), { branchId: "A", amount: 1 }));
  });
});

describe("server-only finance collections", () => {
  it("plans, receipts, supplier payments, reconciliations and cost data are closed to every client", async () => {
    for (const path of ["installments/s1", "payments/p1", "supplierPayments/sp1", "reconciliations/r1", "repairCosts/r1", "saleCosts/s1"]) {
      await assertFails(getDoc(doc(as("owner1"), `tenants/T1/${path}`)));
    }
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/payments/p2"), { amount: 1 }));
  });
});
