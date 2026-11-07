import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { forbidden } from "@/lib/security/errors";

/** Shop profile + settings update. ctx MUST come from requireTenantAccess(settings:write). */
export async function updateShopSettings(ctx, input) {
  const db = adminDb();
  const tenantRef = db.doc(`tenants/${ctx.tenantId}`);
  const membersRef = tenantRef.collection("members");

  await db.runTransaction(async (tx) => {
    const [tenantSnap, membersSnap] = await Promise.all([tx.get(tenantRef), tx.get(membersRef)]);
    if (!tenantSnap.exists) throw forbidden();
    const now = FieldValue.serverTimestamp();

    tx.update(tenantRef, {
      name: input.name,
      "profile.phone": input.phone,
      "profile.city": input.city,
      "profile.address": input.address,
      "settings.timezone": input.timezone,
      updatedAt: now,
    });

    // The shop name is copied into each member's switcher index; keep it in step.
    for (const member of membersSnap.docs) {
      tx.set(
        db.doc(`userTenants/${member.id}/memberships/${ctx.tenantId}`),
        { tenantName: input.name },
        { merge: true }
      );
    }

    tx.set(tenantRef.collection("auditLogs").doc(), {
      action: "SETTINGS_UPDATED",
      actorUid: ctx.user.uid,
      targetType: "tenant",
      targetId: ctx.tenantId,
      createdAt: now,
    });
  });
}

export async function getShopSettings(ctx) {
  const snap = await adminDb().doc(`tenants/${ctx.tenantId}`).get();
  if (!snap.exists) throw forbidden();
  const d = snap.data();
  return {
    name: d.name ?? "",
    slug: d.slug ?? "",
    phone: d.profile?.phone ?? "",
    city: d.profile?.city ?? "",
    address: d.profile?.address ?? "",
    timezone: d.settings?.timezone ?? "Asia/Karachi",
    currency: d.settings?.currency ?? "PKR",
  };
}
