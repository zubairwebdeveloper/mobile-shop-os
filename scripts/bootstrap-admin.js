/**
 * Creates the FIRST platform super admin. This is the ONLY way platformAdmins/{uid} is written:
 * no UI or API path can grant platform admin rights.
 *
 * Usage (real project):
 *   node --env-file=.env.local scripts/bootstrap-admin.js --email you@example.com --confirm-project <projectId>
 * Usage (emulator):
 *   node scripts/bootstrap-admin.js --emulator --email admin@platform.demo --confirm-project demo-msos
 *
 * Safety: the user must already exist in Firebase Auth, and --confirm-project must equal the project
 * the script will actually write to, which prevents running against the wrong environment.
 */
const admin = require("firebase-admin");

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv.includes("--emulator")) {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
}

const email = arg("email");
const confirmProject = arg("confirm-project");
const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (!email || !confirmProject) {
  console.error("Usage: --email <email> --confirm-project <projectId> [--emulator]");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || (usingEmulator ? "demo-msos" : undefined);
if (!projectId) {
  console.error("FIREBASE_ADMIN_PROJECT_ID is not set.");
  process.exit(1);
}
if (projectId !== confirmProject) {
  console.error(`--confirm-project (${confirmProject}) does not match the target project (${projectId}). Aborting.`);
  process.exit(1);
}

if (usingEmulator) {
  admin.initializeApp({ projectId });
} else {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    console.error("Firebase Admin credentials are not configured.");
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
}

(async () => {
  const user = await admin.auth().getUserByEmail(email);
  if (!user.emailVerified) {
    console.error("The user's email is not verified. Verify it first.");
    process.exit(1);
  }

  const db = admin.firestore();
  const ref = db.doc(`platformAdmins/${user.uid}`);
  if ((await ref.get()).exists) {
    console.log("This user is already a platform admin. Nothing changed.");
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set({ level: "SUPER_ADMIN", createdBy: "bootstrap-admin-script", createdAt: now });
  await db.collection("platformAuditLogs").add({
    action: "PLATFORM_ADMIN_BOOTSTRAPPED",
    targetUid: user.uid,
    actor: "bootstrap-admin-script",
    createdAt: now,
  });
  console.log(`Platform admin created for uid ${user.uid} in project ${projectId}.`);
})().catch((error) => {
  console.error("Bootstrap failed:", error?.message ?? error);
  process.exit(1);
});
