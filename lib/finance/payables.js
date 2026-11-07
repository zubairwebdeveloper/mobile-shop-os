import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { rupeesToPaisa } from "@/lib/catalog/pure";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { pagedList } from "@/lib/sales/sales";
import { conflict, notFound } from "@/lib/security/errors";
import { branchScopes } from "./data";
import { purchasePayable, purchaseReceivedValue } from "./pure";

/**
 * Supplier payables: we owe a supplier for goods actually RECEIVED (received quantity x unit cost), minus what was paid.
 * Ordered but not yet received goods are not a debt. Payments are records (cash, bank, wallet), not bank transfers made by the app.
 */

export async function listPayables(ctx, { branchId } = {}) {
  const scopes = branchScopes(ctx, branchId);
  const snaps = await Promise.all(scopes.map((b) => (b ? col(ctx, "purchases").where("branchId", "==", b) : col(ctx, "purchases")).limit(1000).get()));
  const rows = snaps.flatMap((s) => s.docs).map((d) => {
    const p = d.data();
    return {
      id: d.id, number: p.number, supplierId: p.supplierId, supplierName: p.supplierName ?? "", branchId: p.branchId, status: p.status,
      receivedValue: purchaseReceivedValue(p.items), paidAmount: p.paidAmount ?? 0, payable: purchasePayable(p),
    };
  }).filter((r) => r.receivedValue > 0 || r.paidAmount > 0);
  const open = rows.filter((r) => r.payable > 0).sort((a, b) => b.payable - a.payable);
  const bySupplier = {};
  for (const r of open) {
    const k = r.supplierId;
    bySupplier[k] ??= { supplierId: k, supplierName: r.supplierName, payable: 0, purchases: 0 };
    bySupplier[k].payable += r.payable;
    bySupplier[k].purchases += 1;
  }
  return { total: open.reduce((a, r) => a + r.payable, 0), purchases: open, suppliers: Object.values(bySupplier).sort((a, b) => b.payable - a.payable) };
}

const serializeSupplierPayment = (d) => {
  const p = d.data();
  return { id: d.id, number: p.number, branchId: p.branchId, purchaseId: p.purchaseId, purchaseNumber: p.purchaseNumber ?? "", supplierName: p.supplierName ?? "", amount: p.amount, method: p.method, reference: p.reference ?? "", createdAt: iso(p.createdAt) };
};
export const listSupplierPayments = (ctx, opts) => pagedList(ctx, "supplierPayments", serializeSupplierPayment, opts);

export async function paySupplier(ctx, input) {
  const amount = rupeesToPaisa(input.amount);
  const purchaseRef = docRef(ctx, "purchases", input.purchaseId);
  const keyRef = docRef(ctx, "idempotencyKeys", input.paymentKey);
  const counterRef = docRef(ctx, "counters", "supplierPayments");
  const payRef = col(ctx, "supplierPayments").doc();
  let resultId = payRef.id;
  let duplicate = false;
  await adminDb().runTransaction(async (tx) => {
    const [key, purchase, counter] = await Promise.all([tx.get(keyRef), tx.get(purchaseRef), tx.get(counterRef)]);
    if (key.exists) {
      if (key.data().actorUid !== ctx.user.uid || key.data().type !== "SUPPLIER_PAYMENT") throw conflict("KEY_REUSED", "This request key was already used.");
      duplicate = true;
      resultId = key.data().refId;
      return;
    }
    if (!purchase.exists || !mayUseBranch(ctx, purchase.data().branchId)) throw notFound("Purchase not found.");
    const p = purchase.data();
    assertBranch(ctx, p.branchId);
    const payable = purchasePayable(p);
    if (amount > payable) throw conflict("OVERPAYMENT", "That is more than we owe on this purchase (goods received minus payments).");
    const n = (counter.exists ? counter.data().next : 1) ?? 1;
    const now = FieldValue.serverTimestamp();
    tx.set(counterRef, { next: n + 1 });
    tx.update(purchaseRef, { paidAmount: (p.paidAmount ?? 0) + amount, updatedAt: now });
    tx.set(payRef, {
      number: `SPAY-${String(n).padStart(6, "0")}`, branchId: p.branchId, purchaseId: input.purchaseId, purchaseNumber: p.number ?? "",
      supplierId: p.supplierId, supplierName: p.supplierName ?? "", amount, method: input.method, reference: input.reference, createdBy: ctx.user.uid, createdAt: now,
    });
    tx.set(keyRef, { type: "SUPPLIER_PAYMENT", refId: payRef.id, actorUid: ctx.user.uid, createdAt: now });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "SUPPLIER_PAID", actorUid: ctx.user.uid, targetType: "purchase", targetId: input.purchaseId, createdAt: now, detail: { amount, method: input.method },
    });
  });
  return { id: resultId, duplicate };
}
