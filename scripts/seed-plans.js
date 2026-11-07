/**
 * Creates the four plan names from the product brief in the EMULATOR so the Plans and Subscription
 * screens have something to show. Every value is a PLACEHOLDER (isPlaceholder: true, hidden, no price):
 * real prices and limits are the platform owner's decision. Never run against a real project.
 *
 * Usage:  npm run seed:plans     (emulators must be running)
 */
const admin = require("firebase-admin");

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
admin.initializeApp({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "demo-msos" });
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const PLANS = [
  { id: "starter", name: "Starter", sortOrder: 10, limits: { maxBranches: 1, maxEmployees: 3, aiRequestsPerMonth: 0 } },
  { id: "professional", name: "Professional", sortOrder: 20, limits: { maxBranches: 3, maxEmployees: 10, aiRequestsPerMonth: 100 } },
  { id: "business", name: "Business", sortOrder: 30, limits: { maxBranches: 10, maxEmployees: 50, aiRequestsPerMonth: 1000 } },
  { id: "enterprise", name: "Enterprise", sortOrder: 40, limits: { maxBranches: 50, maxEmployees: 500, aiRequestsPerMonth: 10000 } },
];

(async () => {
  for (const plan of PLANS) {
    const ref = db.doc(`platformPlans/${plan.id}`);
    if ((await ref.get()).exists) {
      console.log(`Skipped ${plan.id} (already exists)`);
      continue;
    }
    await ref.set({
      name: plan.name,
      description: "",
      priceMonthly: null,
      currency: "PKR",
      limits: plan.limits,
      features: [],
      isPublic: false,
      status: "ACTIVE",
      sortOrder: plan.sortOrder,
      isPlaceholder: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created placeholder plan ${plan.id}`);
  }
})().catch((error) => {
  console.error("Seed failed:", error?.message ?? error);
  process.exit(1);
});
