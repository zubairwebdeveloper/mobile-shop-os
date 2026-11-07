/**
 * Seeds the Firebase EMULATORS with clearly-labelled DEMO data for local testing.
 * Usage:  npm run seed:emulator     (emulators must be running: npm run emulators)
 *
 * Safety: refuses to run unless emulator hosts are set. It never touches a real project.
 * Demo users all share the password below. It is valid ONLY inside the local Auth emulator.
 */
const admin = require("firebase-admin");

if (process.argv.includes("--emulator")) {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
}

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error("Refusing to seed: emulator environment variables are not set. Use --emulator.");
  process.exit(1);
}

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID || "demo-msos";
admin.initializeApp({ projectId: PROJECT_ID });
const auth = admin.auth();
const db = admin.firestore();

const DEMO_PASSWORD = "Demo#12345";
const now = admin.firestore.FieldValue.serverTimestamp();

const USERS = [
  { uid: "demo-owner-smh", email: "owner@smartmobilehub.demo", name: "Demo Owner (Smart Mobile Hub)" },
  { uid: "demo-cashier-smh", email: "cashier@smartmobilehub.demo", name: "Demo Cashier (Smart Mobile Hub)" },
  { uid: "demo-tech-smh", email: "technician@smartmobilehub.demo", name: "Demo Technician (Smart Mobile Hub)" },
  { uid: "demo-owner-tz", email: "owner@techzone.demo", name: "Demo Owner (Tech Zone Mobiles)" },
  { uid: "demo-admin", email: "admin@platform.demo", name: "Demo Platform Admin" },
];

const TENANTS = [
  {
    id: "demo-smart-mobile-hub",
    name: "Smart Mobile Hub",
    ownerUid: "demo-owner-smh",
    branches: [
      { id: "smh-main", name: "Main Branch" },
      { id: "smh-second", name: "Second Branch" },
    ],
    members: [
      { uid: "demo-owner-smh", role: "OWNER", allBranches: true, branchIds: [] },
      { uid: "demo-cashier-smh", role: "CASHIER", allBranches: false, branchIds: ["smh-main"] },
      { uid: "demo-tech-smh", role: "TECHNICIAN", allBranches: false, branchIds: ["smh-main"] },
    ],
  },
  {
    id: "demo-tech-zone-mobiles",
    name: "Tech Zone Mobiles",
    ownerUid: "demo-owner-tz",
    branches: [{ id: "tz-main", name: "Main Branch" }],
    members: [{ uid: "demo-owner-tz", role: "OWNER", allBranches: true, branchIds: [] }],
  },
];

async function ensureUser(u) {
  try {
    await auth.deleteUser(u.uid);
  } catch {
    /* did not exist */
  }
  await auth.createUser({
    uid: u.uid,
    email: u.email,
    password: DEMO_PASSWORD,
    emailVerified: true,
    displayName: u.name,
  });
}

async function main() {
  for (const u of USERS) await ensureUser(u);

  for (const t of TENANTS) {
    await db.doc(`tenants/${t.id}`).set({
      name: t.name,
      slug: t.id,
      status: "ACTIVE",
      ownerUid: t.ownerUid,
      planId: "starter",
      isDemo: true, // clearly labelled demonstration data
      createdAt: now,
    });

    for (const b of t.branches) {
      await db.doc(`tenants/${t.id}/branches/${b.id}`).set({ name: b.name, active: true, createdAt: now });
    }

    for (const m of t.members) {
      const user = USERS.find((u) => u.uid === m.uid);
      await db.doc(`tenants/${t.id}/members/${m.uid}`).set({
        role: m.role,
        status: "ACTIVE",
        allBranches: m.allBranches,
        branchIds: m.branchIds,
        displayName: user.name,
        email: user.email,
        createdAt: now,
      });
      await db.doc(`userTenants/${m.uid}/memberships/${t.id}`).set({
        tenantName: t.name,
        role: m.role,
        status: "ACTIVE",
        createdAt: now,
      });
    }
  }

  await db.doc("platformAdmins/demo-admin").set({ level: "SUPER_ADMIN", createdBy: "seed-demo-data", createdAt: now });

  console.log(`Seeded DEMO data into emulators (project ${PROJECT_ID}).`);
  console.log(`Users (password for all: ${DEMO_PASSWORD}):`);
  for (const u of USERS) console.log(`  ${u.email}`);
}

main().catch((error) => {
  console.error("Seed failed:", error?.message ?? error);
  process.exit(1);
});
