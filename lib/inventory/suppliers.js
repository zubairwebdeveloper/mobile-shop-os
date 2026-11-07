import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { col, docRef } from "./common";

/** Supplier records. ctx MUST come from requireTenantAccess(purchases:read / purchases:write). Payables arrive with Phase 10. */

const serialize = (d) => ({
  id: d.id,
  name: d.data().name,
  phone: d.data().phone ?? "",
  city: d.data().city ?? "",
  address: d.data().address ?? "",
  notes: d.data().notes ?? "",
  active: d.data().active !== false,
});

export async function listSuppliers(ctx) {
  const snap = await col(ctx, "suppliers").orderBy("nameLower", "asc").limit(500).get();
  return snap.docs.map(serialize);
}

const fields = (input) => ({
  name: input.name, nameLower: input.name.toLowerCase(), phone: input.phone, city: input.city,
  address: input.address, notes: input.notes, active: input.active !== false,
});

export async function createSupplier(ctx, input) {
  const ref = col(ctx, "suppliers").doc();
  await adminDb().runTransaction(async (tx) => {
    const dup = await tx.get(col(ctx, "suppliers").where("nameLower", "==", input.name.toLowerCase()).limit(1));
    if (!dup.empty) throw conflict("NAME_TAKEN", "A supplier with this name already exists.");
    const now = FieldValue.serverTimestamp();
    tx.set(ref, { ...fields(input), createdAt: now, createdBy: ctx.user.uid });
    tx.set(col(ctx, "auditLogs").doc(), { action: "SUPPLIER_CREATED", actorUid: ctx.user.uid, targetType: "supplier", targetId: ref.id, createdAt: now });
  });
  return { id: ref.id };
}

export async function updateSupplier(ctx, id, input) {
  if (!isSafeId(id)) throw notFound("Supplier not found.");
  const ref = docRef(ctx, "suppliers", id);
  await adminDb().runTransaction(async (tx) => {
    const [snap, dup] = await Promise.all([tx.get(ref), tx.get(col(ctx, "suppliers").where("nameLower", "==", input.name.toLowerCase()).limit(2))]);
    if (!snap.exists) throw notFound("Supplier not found.");
    if (dup.docs.some((d) => d.id !== id)) throw conflict("NAME_TAKEN", "A supplier with this name already exists.");
    const now = FieldValue.serverTimestamp();
    tx.update(ref, { ...fields(input), updatedAt: now });
    tx.set(col(ctx, "auditLogs").doc(), { action: "SUPPLIER_UPDATED", actorUid: ctx.user.uid, targetType: "supplier", targetId: id, createdAt: now });
  });
}
