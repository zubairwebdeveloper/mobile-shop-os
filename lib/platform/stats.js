import "server-only";
import { adminDb } from "@/lib/firebase/admin";

const count = async (query) => (await query.count().get()).data().count;

/**
 * Platform-wide counters using Firestore count aggregations (billed as index entries, not documents).
 * Everything here is a real count; nothing is estimated.
 */
export async function getPlatformStats() {
  const db = adminDb();
  const tenants = db.collection("tenants");

  const [totalTenants, activeTenants, suspendedTenants, pendingApplications, registeredUsers, plans] =
    await Promise.all([
      count(tenants),
      count(tenants.where("status", "==", "ACTIVE")),
      count(tenants.where("status", "==", "SUSPENDED")),
      count(db.collection("tenantApplications").where("status", "==", "PENDING")),
      count(db.collection("platformUsers")),
      count(db.collection("platformPlans")),
    ]);

  return { totalTenants, activeTenants, suspendedTenants, pendingApplications, registeredUsers, plans };
}
