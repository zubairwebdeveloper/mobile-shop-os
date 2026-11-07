import "server-only";
import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { rupeesToPaisa, variantLabel } from "@/lib/catalog/pure";
import { canTransition, MAX_REPAIR_PARTS, PARTS_EDITABLE, repairNumber, repairTotals, settleDelivery, warrantyState } from "@/lib/customers/pure";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { StockBook } from "@/lib/inventory/stock";
import { canAccessBranch } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { pagedList } from "@/lib/sales/sales";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { getShopSettings } from "@/lib/tenant/settings";

/**
 * Repair jobs: intake, diagnosis, parts (taken from stock), status history and hand-over.
 * Needs repairs:read / repairs:write and access to the job's branch.
 * Parts are plain stocked items (never IMEI-tracked devices) and leave stock when added, return when removed or the job is cancelled.
 * At hand-over the amount collected is a RECORD (cash, bank, JazzCash, Easypaisa); repair income is not in sales or the daily
 * closing yet (Phase 10 finance). A warranty repair is free: its final cost is forced to 0.
 */

const TERMINAL = ["DELIVERED", "CANCELLED"];

export const serializeRepair = (d) => {
  const r = d.data();
  const parts = r.parts ?? [];
  const { partsTotal, total } = repairTotals({ labourCharge: r.labourCharge ?? 0, parts });
  return {
    id: d.id, number: r.number, branchId: r.branchId, status: r.status, customerId: r.customerId ?? null, customerName: r.customerName ?? "",
    customerPhone: r.customerPhone ?? "", deviceBrand: r.deviceBrand, deviceModel: r.deviceModel, imei: r.imei ?? "", issue: r.issue,
    accessories: r.accessories ?? "", diagnosis: r.diagnosis ?? "", estimatedCost: r.estimatedCost ?? 0, labourCharge: r.labourCharge ?? 0,
    parts, partsTotal, total, technicianUid: r.technicianUid ?? "", technicianName: r.technicianName ?? "", warrantyId: r.warrantyId ?? null,
    underWarranty: r.underWarranty === true, finalCost: r.finalCost ?? null, collected: r.collected ?? null, dueAmount: r.dueAmount ?? 0,
    collectionMethod: r.collectionMethod ?? "", history: r.history ?? [], createdAt: iso(r.createdAt), deliveredAt: iso(r.deliveredAt),
  };
};

export const listRepairs = (ctx, opts) => pagedList(ctx, "repairJobs", serializeRepair, opts);

export async function getRepair(ctx, id) {
  if (!isSafeId(id)) return null;
  const snap = await docRef(ctx, "repairJobs", id).get();
  return snap.exists && mayUseBranch(ctx, snap.data().branchId) ? serializeRepair(snap) : null;
}

/** Members who can be given a job in this branch: owners, managers and technicians. */
export async function listTechnicians(ctx, branchId) {
  const snap = await col(ctx, "members").where("status", "==", "ACTIVE").limit(200).get();
  return snap.docs
    .filter((d) => ["OWNER", "MANAGER", "TECHNICIAN"].includes(d.data().role) && canAccessBranch(d.data(), branchId))
    .map((d) => ({ uid: d.id, name: d.data().displayName || d.data().email || d.id, role: d.data().role }));
}

export async function createRepair(ctx, input) {
  assertBranch(ctx, input.branchId);
  const { timezone } = await getShopSettings(ctx);
  const today = dayKey(new Date(), timezone);
  const ref = col(ctx, "repairJobs").doc();
  const counterRef = docRef(ctx, "counters", "repairs");

  await adminDb().runTransaction(async (tx) => {
    const [counter, branch, customer, warranty] = await Promise.all([
      tx.get(counterRef),
      tx.get(docRef(ctx, "branches", input.branchId)),
      input.customerId ? tx.get(docRef(ctx, "customers", input.customerId)) : null,
      input.warrantyId ? tx.get(docRef(ctx, "warranties", input.warrantyId)) : null,
    ]);
    if (!branch.exists || branch.data().active === false) throw notFound("Branch not found.");
    if (customer && (!customer.exists || customer.data().status === "ARCHIVED")) throw notFound("Customer not found.");
    let underWarranty = false;
    if (warranty) {
      if (!warranty.exists || !mayUseBranch(ctx, warranty.data().branchId)) throw notFound("Warranty not found.");
      if (warrantyState(warranty.data(), today).state !== "ACTIVE") throw conflict("WARRANTY_NOT_ACTIVE", "That warranty has expired or is void.");
      underWarranty = true;
    }
    const n = (counter.exists ? counter.data().next : 1) ?? 1;
    const now = FieldValue.serverTimestamp();
    const cd = customer?.data();
    tx.set(counterRef, { next: n + 1 });
    tx.set(ref, {
      number: repairNumber(n), branchId: input.branchId, status: "RECEIVED", customerId: cd ? customer.id : warranty?.data().customerId ?? null,
      customerName: cd?.name ?? input.customerName, customerPhone: cd?.phone ?? (input.customerPhone || warranty?.data().customerPhone || ""),
      deviceBrand: input.deviceBrand, deviceModel: input.deviceModel, imei: input.imei, issue: input.issue, accessories: input.accessories,
      diagnosis: "", estimatedCost: rupeesToPaisa(input.estimatedCost) ?? 0, labourCharge: 0, parts: [], technicianUid: "", technicianName: "",
      warrantyId: input.warrantyId ?? null, underWarranty, dueAmount: 0,
      history: [{ status: "RECEIVED", at: new Date().toISOString(), by: ctx.user.uid, note: "" }], createdBy: ctx.user.uid, createdAt: now,
    });
    tx.set(col(ctx, "auditLogs").doc(), { action: "REPAIR_CREATED", actorUid: ctx.user.uid, targetType: "repair", targetId: ref.id, createdAt: now, detail: { number: repairNumber(n) } });
  });
  return { id: ref.id };
}

/** action: UPDATE | STATUS | ADD_PART | REMOVE_PART */
export async function changeRepair(ctx, id, input) {
  if (!isSafeId(id)) throw notFound("Repair job not found.");
  const ref = docRef(ctx, "repairJobs", id);

  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) throw notFound("Repair job not found.");
    const job = snap.data();
    assertBranch(ctx, job.branchId);
    if (TERMINAL.includes(job.status)) throw conflict("INVALID_STATE", "This job is finished and cannot be changed.");
    const now = FieldValue.serverTimestamp();
    const stamp = new Date().toISOString();
    const parts = [...(job.parts ?? [])];
    const history = [...(job.history ?? [])];
    let patch = {};

    if (input.action === "UPDATE") {
      let technician = { technicianUid: "", technicianName: "" };
      if (input.technicianUid) {
        const member = await tx.get(docRef(ctx, "members", input.technicianUid));
        const m = member.exists ? member.data() : null;
        if (!m || m.status !== "ACTIVE" || !["OWNER", "MANAGER", "TECHNICIAN"].includes(m.role) || !canAccessBranch(m, job.branchId)) {
          throw conflict("TECHNICIAN_UNAVAILABLE", "That person cannot take repair jobs in this branch.");
        }
        technician = { technicianUid: member.id, technicianName: m.displayName || m.email || member.id };
      }
      patch = { estimatedCost: rupeesToPaisa(input.estimatedCost) ?? 0, labourCharge: rupeesToPaisa(input.labourCharge) ?? 0, diagnosis: input.diagnosis, ...technician };
    } else if (input.action === "STATUS") {
      if (!canTransition(job.status, input.status)) throw conflict("INVALID_TRANSITION", `A job that is ${job.status.toLowerCase().replace(/_/g, " ")} cannot move to ${input.status.toLowerCase().replace(/_/g, " ")}.`);
      patch = { status: input.status };
      if (input.status === "CANCELLED" && parts.length > 0) {
        const book = new StockBook(ctx);
        await book.load(tx, parts.map((p) => ({ variantId: p.variantId, branchId: job.branchId })));
        for (const p of parts) {
          book.change({ variantId: p.variantId, branchId: job.branchId, productId: p.productId, productName: p.productName, variantLabel: p.variantLabel, delta: p.quantity, type: "REPAIR_RETURN", refType: "repair", refId: id });
        }
        book.commit(tx);
        patch.parts = [];
      }
      if (input.status === "DELIVERED") {
        const { total } = repairTotals({ labourCharge: job.labourCharge ?? 0, parts });
        const settled = settleDelivery({ total, collected: rupeesToPaisa(input.collected) ?? 0, underWarranty: job.underWarranty === true, hasCustomer: Boolean(job.customerId) });
        if (!settled.ok) throw conflict(settled.code, settled.message);
        patch = { ...patch, finalCost: settled.finalCost, collected: settled.collected, dueAmount: settled.dueAmount, collectionMethod: settled.collected > 0 ? input.method : "", deliveredAt: now };
      }
      history.push({ status: input.status, at: stamp, by: ctx.user.uid, note: input.note });
      patch.history = history;
    } else if (input.action === "ADD_PART") {
      if (!PARTS_EDITABLE.includes(job.status)) throw conflict("INVALID_STATE", "Parts can be added while the job is being diagnosed or repaired.");
      if (parts.length >= MAX_REPAIR_PARTS) throw conflict("TOO_MANY_PARTS", `At most ${MAX_REPAIR_PARTS} parts per job.`);
      const variant = await tx.get(docRef(ctx, "productVariants", input.variantId));
      if (!variant.exists) throw notFound("Part not found.");
      const product = await tx.get(docRef(ctx, "products", variant.data().productId));
      if (!product.exists || product.data().status !== "ACTIVE" || variant.data().status !== "ACTIVE") throw conflict("ITEM_UNAVAILABLE", "That part is not available.");
      if (product.data().tracksImei === true) throw conflict("PART_NOT_STOCKED", "Devices tracked by IMEI cannot be used as repair parts.");
      const book = new StockBook(ctx);
      await book.load(tx, [{ variantId: variant.id, branchId: job.branchId }]);
      const label = variantLabel(variant.data());
      book.change({ variantId: variant.id, branchId: job.branchId, productId: product.id, productName: product.data().name, variantLabel: label, delta: -input.quantity, type: "REPAIR_USE", refType: "repair", refId: id });
      book.commit(tx);
      const partId = randomBytes(6).toString("hex");
      parts.push({ id: partId, variantId: variant.id, productId: product.id, productName: product.data().name, variantLabel: label, quantity: input.quantity, unitPrice: rupeesToPaisa(input.unitPrice) ?? 0 });
      // Purchase cost is business-private: it goes in a server-only document, never on the job that cashiers and technicians can read.
      tx.set(docRef(ctx, "repairCosts", id), { branchId: job.branchId, costs: { [partId]: variant.data().purchasePrice ?? null } }, { merge: true });
      patch = { parts };
    } else {
      if (!PARTS_EDITABLE.includes(job.status)) throw conflict("INVALID_STATE", "Parts can only be removed while the job is being diagnosed or repaired.");
      const at = parts.findIndex((p) => p.id === input.partId);
      if (at < 0) throw notFound("Part not found.");
      const p = parts[at];
      const book = new StockBook(ctx);
      await book.load(tx, [{ variantId: p.variantId, branchId: job.branchId }]);
      book.change({ variantId: p.variantId, branchId: job.branchId, productId: p.productId, productName: p.productName, variantLabel: p.variantLabel, delta: p.quantity, type: "REPAIR_RETURN", refType: "repair", refId: id });
      book.commit(tx);
      parts.splice(at, 1);
      tx.set(docRef(ctx, "repairCosts", id), { branchId: job.branchId, costs: { [p.id]: FieldValue.delete() } }, { merge: true });
      patch = { parts };
    }
    tx.update(ref, { ...patch, updatedAt: now });
    tx.set(col(ctx, "auditLogs").doc(), { action: `REPAIR_${input.action}`, actorUid: ctx.user.uid, targetType: "repair", targetId: id, createdAt: now, detail: input.action === "STATUS" ? { status: input.status } : {} });
  });
  return { ok: true };
}
