/** Rules for Phase 11 data. Run with the emulator:  npm run test:rules */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";

let testEnv;
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-msos-hr-rules",
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
    await m("mgrA", "MANAGER", "A");
    await m("cashA", "CASHIER", "A");
    await m("acctA", "ACCOUNTANT", "A");
    await setDoc(doc(db, "tenants/T2"), { name: "T2", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/T2/members/owner2"), { role: "OWNER", status: "ACTIVE", allBranches: true, branchIds: [] });
    await setDoc(doc(db, "tenants/T1/employees/eA"), { branchId: "A", name: "Ali" });
    await setDoc(doc(db, "tenants/T1/employees/eB"), { branchId: "B", name: "Bilal" });
    for (const path of ["attendance/eA_2026-11-05", "leaveRequests/l1", "commissions/eA_2026-10", "employeeLinks/uid1"]) {
      await setDoc(doc(db, `tenants/T1/${path}`), { branchId: "A" });
    }
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();

describe("employees", () => {
  it("owner reads all; a branch manager reads only her branch; cashier and accountant read none", async () => {
    await assertSucceeds(getDoc(doc(as("owner1"), "tenants/T1/employees/eB")));
    await assertSucceeds(getDoc(doc(as("mgrA"), "tenants/T1/employees/eA")));
    await assertFails(getDoc(doc(as("mgrA"), "tenants/T1/employees/eB")));
    await assertFails(getDoc(doc(as("cashA"), "tenants/T1/employees/eA")));
    await assertFails(getDoc(doc(as("acctA"), "tenants/T1/employees/eA")));
  });
  it("another shop and any client write are refused", async () => {
    await assertFails(getDoc(doc(as("owner2"), "tenants/T1/employees/eA")));
    await assertFails(updateDoc(doc(as("owner1"), "tenants/T1/employees/eA"), { name: "x" }));
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/employees/new"), { branchId: "A" }));
  });
});

describe("server-only HR collections", () => {
  it("attendance, leave, commission and links are closed to every client", async () => {
    for (const path of ["attendance/eA_2026-11-05", "leaveRequests/l1", "commissions/eA_2026-10", "employeeLinks/uid1"]) {
      await assertFails(getDoc(doc(as("owner1"), `tenants/T1/${path}`)));
    }
    await assertFails(setDoc(doc(as("owner1"), "tenants/T1/attendance/x"), { branchId: "A" }));
  });
});
