import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { serializeRepair } from "@/lib/repairs/repairs";
import { serializeSale } from "@/lib/sales/sales";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { serializeWarranty } from "@/lib/warranty/warranty";
import { getShopSettings } from "@/lib/tenant/settings";
import { dayKey } from "@/lib/sales/pure";
import { customerStats, normalizePhone } from "./pure";

/**
 * Customer CRM. ctx MUST come from requireTenantAccess(customers:read / customers:write).
 * Layout: customers/{id} holds what front-desk staff need (name, phone, city, VIP, consent, status); email, address and
 * internal notes live in customers/{id}/private/profile and are returned only to roles with customers:private-read.
 * One customer per phone number per shop (customerPhones/{normalized} claim written in the same transaction).
 * Balances and totals are computed from the customer's sales and repair jobs in the branches the viewer may see.
 */

const publicFields = (d) => ({
  id: d.id, name: d.data().name, phone: d.data().phone, city: d.data().city ?? "", vip: d.data().vip === true,
  marketingConsent: d.data().marketingConsent === true, status: d.data().status ?? "ACTIVE", createdAt: iso(d.data().createdAt),
});

const canSeePrivate = (ctx) => can(ctx.role, PERMISSIONS.CUSTOMERS_PRIVATE_READ);

/** q empty -> first 200 by name; a phone number -> exact match; otherwise name prefix. */
export async function searchCustomers(ctx, { q = "", limit = 200 } = {}) {
  const text = String(q).trim();
  const norm = text.replace(/\D/g, "").length >= 6 ? normalizePhone(text) : null;
  if (norm) {
    const claim = await docRef(ctx, "customerPhones", norm).get();
    if (!claim.exists) return [];
    const snap = await docRef(ctx, "customers", claim.data().customerId).get();
    return snap.exists ? [publicFields(snap)] : [];
  }
  let query = col(ctx, "customers").orderBy("nameLower", "asc");
  if (text) {
    const lower = text.toLowerCase();
    query = query.where("nameLower", ">=", lower).where("nameLower", "<", `${lower}`);
  }
  return (await query.limit(limit).get()).docs.map(publicFields);
}

export async function createCustomer(ctx, input) {
  const norm = normalizePhone(input.phone);
  const ref = col(ctx, "customers").doc();
  await adminDb().runTransaction(async (tx) => {
    const claimRef = docRef(ctx, "customerPhones", norm);
    const claim = await tx.get(claimRef);
    if (claim.exists) throw conflict("PHONE_TAKEN", "A customer with this phone number already exists.");
    const now = FieldValue.serverTimestamp();
    tx.set(claimRef, { customerId: ref.id, createdAt: now });
    tx.set(ref, {
      name: input.name, nameLower: input.name.toLowerCase(), phone: input.phone, phoneNorm: norm, city: input.city,
      vip: canSeePrivate(ctx) ? input.vip : false, marketingConsent: input.marketingConsent, status: "ACTIVE", createdBy: ctx.user.uid, createdAt: now,
    });
    tx.set(ref.collection("private").doc("profile"), { email: input.email, address: input.address, notes: input.notes, updatedAt: now });
    tx.set(col(ctx, "auditLogs").doc(), { action: "CUSTOMER_CREATED", actorUid: ctx.user.uid, targetType: "customer", targetId: ref.id, createdAt: now });
  });
  return { id: ref.id };
}

export async function updateCustomer(ctx, id, input) {
  if (!isSafeId(id)) throw notFound("Customer not found.");
  const ref = docRef(ctx, "customers", id);
  const norm = normalizePhone(input.phone);
  const priv = canSeePrivate(ctx);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw notFound("Customer not found.");
    const before = snap.data();
    const phoneChanged = norm !== before.phoneNorm;
    const newClaim = phoneChanged ? await tx.get(docRef(ctx, "customerPhones", norm)) : null;
    if (newClaim?.exists) throw conflict("PHONE_TAKEN", "Another customer already has this phone number.");
    const now = FieldValue.serverTimestamp();
    if (phoneChanged) {
      tx.delete(docRef(ctx, "customerPhones", before.phoneNorm));
      tx.set(docRef(ctx, "customerPhones", norm), { customerId: id, createdAt: now });
    }
    tx.update(ref, {
      name: input.name, nameLower: input.name.toLowerCase(), phone: input.phone, phoneNorm: norm, city: input.city,
      marketingConsent: input.marketingConsent, status: priv ? input.status : before.status ?? "ACTIVE", vip: priv ? input.vip : before.vip === true, updatedAt: now,
    });
    if (priv) tx.set(ref.collection("private").doc("profile"), { email: input.email, address: input.address, notes: input.notes, updatedAt: now }, { merge: true });
    tx.set(col(ctx, "auditLogs").doc(), { action: "CUSTOMER_UPDATED", actorUid: ctx.user.uid, targetType: "customer", targetId: id, createdAt: now });
  });
  return { ok: true };
}

const MAX_HISTORY = 200;

/** Profile + history. Sales, repairs and warranties are limited to the viewer's branches. */
export async function getCustomer(ctx, id) {
  if (!isSafeId(id)) return null;
  const snap = await docRef(ctx, "customers", id).get();
  if (!snap.exists) return null;
  const [privateSnap, salesSnap, repairSnap, warrantySnap, shop] = await Promise.all([
    canSeePrivate(ctx) ? snap.ref.collection("private").doc("profile").get() : null,
    col(ctx, "sales").where("customerId", "==", id).limit(MAX_HISTORY).get(),
    col(ctx, "repairJobs").where("customerId", "==", id).limit(MAX_HISTORY).get(),
    col(ctx, "warranties").where("customerId", "==", id).limit(MAX_HISTORY).get(),
    getShopSettings(ctx),
  ]);
  const today = dayKey(new Date(), shop.timezone);
  const visible = (d) => mayUseBranch(ctx, d.data().branchId);
  const byNewest = (a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  const sales = salesSnap.docs.filter(visible).map(serializeSale).sort(byNewest);
  const repairs = repairSnap.docs.filter(visible).map(serializeRepair).sort(byNewest);
  const warranties = warrantySnap.docs.filter(visible).map((d) => serializeWarranty(d, today)).sort(byNewest);
  const devices = sales.flatMap((s) => s.items.flatMap((i) => i.imeis.map((imei) => ({ imei, productName: i.productName, variantLabel: i.variantLabel, saleNumber: s.number, saleId: s.id, soldAt: s.createdAt }))));
  const p = privateSnap?.exists ? privateSnap.data() : null;
  return {
    customer: publicFields(snap),
    private: p ? { email: p.email ?? "", address: p.address ?? "", notes: p.notes ?? "" } : null,
    stats: customerStats({ sales, repairs }),
    sales, repairs, warranties, devices,
    truncated: salesSnap.size >= MAX_HISTORY || repairSnap.size >= MAX_HISTORY,
  };
}
