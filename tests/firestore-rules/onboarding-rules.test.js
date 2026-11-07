/**
 * Rules for the onboarding collections. Run with the emulator:  npm run test:rules
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-msos-onboarding-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "tenantApplications/userA"), { applicantUid: "userA", status: "PENDING", shopName: "A" });
    await setDoc(doc(db, "tenantApplications/userB"), { applicantUid: "userB", status: "PENDING", shopName: "B" });
    await setDoc(doc(db, "platformAdmins/admin1"), { level: "SUPER_ADMIN" });
    await setDoc(doc(db, "tenantSlugs/shop-a"), { tenantId: "T1" });
    await setDoc(doc(db, "platformUsers/userA"), { email: "a@example.test" });
    await setDoc(doc(db, "tenants/T1"), { name: "Shop A", status: "ACTIVE" });
  });
});

const as = (uid) => testEnv.authenticatedContext(uid).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

describe("tenantApplications", () => {
  it("the applicant reads their own application only", async () => {
    await assertSucceeds(getDoc(doc(as("userA"), "tenantApplications/userA")));
    await assertFails(getDoc(doc(as("userA"), "tenantApplications/userB")));
    await assertFails(getDoc(doc(anon(), "tenantApplications/userA")));
  });

  it("a filtered query for own applications works; an unfiltered list does not", async () => {
    const applications = collection(as("userA"), "tenantApplications");
    await assertSucceeds(getDocs(query(applications, where("applicantUid", "==", "userA"))));
    await assertFails(getDocs(applications));
  });

  it("platform admins read every application", async () => {
    await assertSucceeds(getDoc(doc(as("admin1"), "tenantApplications/userA")));
    await assertSucceeds(getDocs(collection(as("admin1"), "tenantApplications")));
  });

  it("nobody can write applications from the client (submission and decisions are server-only)", async () => {
    await assertFails(setDoc(doc(as("userC"), "tenantApplications/userC"), { applicantUid: "userC", status: "PENDING" }));
    await assertFails(updateDoc(doc(as("userA"), "tenantApplications/userA"), { status: "APPROVED" }));
    await assertFails(updateDoc(doc(as("admin1"), "tenantApplications/userA"), { status: "APPROVED" }));
    await assertFails(deleteDoc(doc(as("userA"), "tenantApplications/userA")));
  });
});

describe("tenant creation and slugs", () => {
  it("clients cannot create tenants, even with a believable payload", async () => {
    await assertFails(setDoc(doc(as("userA"), "tenants/fake"), { name: "Fake", status: "ACTIVE", ownerUid: "userA" }));
    await assertFails(setDoc(doc(as("admin1"), "tenants/fake"), { name: "Fake", status: "ACTIVE", ownerUid: "admin1" }));
  });

  it("clients cannot create their own membership", async () => {
    await assertFails(setDoc(doc(as("userA"), "tenants/T1/members/userA"), { role: "OWNER", status: "ACTIVE", allBranches: true }));
    await assertFails(setDoc(doc(as("userA"), "userTenants/userA/memberships/T1"), { role: "OWNER", status: "ACTIVE" }));
  });

  it("tenantSlugs is invisible and read-only-denied to everyone, including platform admins", async () => {
    await assertFails(getDoc(doc(as("userA"), "tenantSlugs/shop-a")));
    await assertFails(getDoc(doc(as("admin1"), "tenantSlugs/shop-a")));
    await assertFails(setDoc(doc(as("userA"), "tenantSlugs/mine"), { tenantId: "T1" }));
    await assertFails(deleteDoc(doc(as("admin1"), "tenantSlugs/shop-a")));
  });
});

describe("platformUsers", () => {
  it("users read only their own profile and cannot write it", async () => {
    await assertSucceeds(getDoc(doc(as("userA"), "platformUsers/userA")));
    await assertFails(getDoc(doc(as("userB"), "platformUsers/userA")));
    await assertFails(updateDoc(doc(as("userA"), "platformUsers/userA"), { email: "evil@example.test" }));
  });
});
