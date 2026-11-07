/**
 * Storage rules tests (cross-service: Storage rules read Firestore membership documents).
 * Run with the emulators:  npm run test:rules
 * UNVERIFIED in the authoring environment: if cross-service emulator behaviour differs,
 * adjust the setup, not the rules' intent (tenant-scoped, role-based, default deny).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-msos-storage-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "tenants/A"), { status: "ACTIVE" });
    await setDoc(doc(db, "tenants/B"), { status: "ACTIVE" });
    await setDoc(doc(db, "tenants/A/members/ownerA"), { role: "OWNER", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/A/members/cashierA"), { role: "CASHIER", status: "ACTIVE" });
    await setDoc(doc(db, "tenants/B/members/ownerB"), { role: "OWNER", status: "ACTIVE" });

    const storage = ctx.storage();
    await uploadBytes(ref(storage, "tenants/A/private/seller-id.pdf"), new Uint8Array([1, 2, 3]), {
      contentType: "application/pdf",
    });
    await uploadBytes(ref(storage, "tenants/A/public/logo.png"), new Uint8Array([1, 2, 3]), {
      contentType: "image/png",
    });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

const storageAs = (uid) => testEnv.authenticatedContext(uid).storage();
const png = { contentType: "image/png" };
const bytes = () => new Uint8Array([1, 2, 3]);

describe("tenant-scoped storage", () => {
  it("owner of A can read private documents of A", async () => {
    await assertSucceeds(getBytes(ref(storageAs("ownerA"), "tenants/A/private/seller-id.pdf")));
  });

  it("cashier of A cannot read private documents", async () => {
    await assertFails(getBytes(ref(storageAs("cashierA"), "tenants/A/private/seller-id.pdf")));
  });

  it("owner of B cannot read or write tenant A files", async () => {
    await assertFails(getBytes(ref(storageAs("ownerB"), "tenants/A/private/seller-id.pdf")));
    await assertFails(uploadBytes(ref(storageAs("ownerB"), "tenants/A/public/evil.png"), bytes(), png));
  });

  it("public branding files are readable without login, writable only by OWNER/MANAGER", async () => {
    const anonStorage = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(getBytes(ref(anonStorage, "tenants/A/public/logo.png")));
    await assertFails(uploadBytes(ref(anonStorage, "tenants/A/public/x.png"), bytes(), png));
    await assertFails(uploadBytes(ref(storageAs("cashierA"), "tenants/A/public/x.png"), bytes(), png));
    await assertSucceeds(uploadBytes(ref(storageAs("ownerA"), "tenants/A/public/new.png"), bytes(), png));
  });

  it("rejects non-image content in public paths", async () => {
    await assertFails(
      uploadBytes(ref(storageAs("ownerA"), "tenants/A/public/script.html"), bytes(), {
        contentType: "text/html",
      })
    );
  });

  it("paths outside tenants/ are denied", async () => {
    await assertFails(getBytes(ref(storageAs("ownerA"), "random/file.png")));
  });
});
