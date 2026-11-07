import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { rupeesToPaisa } from "@/lib/catalog/pure";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { pagedList } from "@/lib/sales/sales";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { allocatePayment, applyCollection, effectiveSchedule, receiptNumber } from "./pure";

/**
 * Collecting money owed on a credit sale or a delivered repair, plus receipts.
 * One transaction: idempotency key, the balance, the installment plan (if any), the receipt and the audit log move together.
 * The original sale tenders and repair hand-over amount are never rewritten, so period reports never double count.
 * Needs sales:create (cashier at the counter). This RECORDS money received; it does not talk to a bank, JazzCash or Easypaisa.
 */

export const serializePayment = (d) => {
  const p = d.data();
  return {
    id: d.id, number: p.number, branchId: p.branchId, targetType: p.targetType, targetId: p.targetId, targetNumber: p.targetNumber ?? "",
    customerName: p.customerName ?? "", customerPhone: p.customerPhone ?? "", amount: p.amount, method: p.method, reference: p.reference ?? "",
    balanceAfter: p.balanceAfter ?? 0, allocations: p.allocations ?? [], createdBy: p.createdBy ?? null, createdAt: iso(p.createdAt),
  };
};

export const listPayments = (ctx, opts) => pagedList(ctx, "payments", serializePayment, opts);

export async function getPayment(ctx, id) {
  if (!isSafeId(id)) return null;
  const snap = await docRef(ctx, "payments", id).get();
  if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) return null;
  return serializePayment(snap);
}

export async function collectPayment(ctx, input) {
  const amount = rupeesToPaisa(input.amount);
  const payRef = col(ctx, "payments").doc();
  const keyRef = docRef(ctx, "idempotencyKeys", input.paymentKey);
  const counterRef = docRef(ctx, "counters", "payments");
  const targetRef = docRef(ctx, input.targetType === "SALE" ? "sales" : "repairJobs", input.targetId);
  const planRef = docRef(ctx, "installments", input.targetId);
  let resultId = payRef.id;
  let duplicate = false;

  await adminDb().runTransaction(async (tx) => {
    const [key, target, counter, plan] = await Promise.all([
      tx.get(keyRef), tx.get(targetRef), tx.get(counterRef), input.targetType === "SALE" ? tx.get(planRef) : Promise.resolve(null),
    ]);
    if (key.exists) {
      if (key.data().actorUid !== ctx.user.uid || key.data().type !== "PAYMENT") throw conflict("KEY_REUSED", "This request key was already used.");
      duplicate = true;
      resultId = key.data().refId;
      return;
    }
    if (!target.exists || !mayUseBranch(ctx, target.data().branchId)) throw notFound("Not found.");
    const t = target.data();
    assertBranch(ctx, t.branchId);
    if (input.targetType === "REPAIR" && t.status !== "DELIVERED") throw conflict("INVALID_STATE", "Only a delivered repair can have a balance collected.");
    if (input.targetType === "SALE" && t.status === "CANCELLED") throw conflict("INVALID_STATE", "This sale is cancelled.");
    const applied = applyCollection(t, amount);
    if (!applied.ok) throw conflict(applied.code, applied.message);

    const now = FieldValue.serverTimestamp();
    let allocations = [];
    if (input.targetType === "SALE") {
      tx.update(targetRef, {
        dueAmount: applied.dueAmount, paidAmount: (t.paidAmount ?? 0) + amount,
        paymentStatus: applied.dueAmount === 0 ? "PAID" : "PARTIAL", updatedAt: now,
      });
      if (plan?.exists && plan.data().status === "ACTIVE") {
        const rows = (plan.data().schedule ?? []).map((r) => ({ ...r }));
        const eff = effectiveSchedule(rows, t.dueAmount ?? 0);
        allocations = allocatePayment(eff, amount).allocations;
        for (const a of allocations) rows.find((r) => r.no === a.no).paid += a.amount;
        tx.update(planRef, { schedule: rows, status: applied.dueAmount === 0 ? "COMPLETED" : "ACTIVE", updatedAt: now });
      }
    } else {
      tx.update(targetRef, { dueAmount: applied.dueAmount, collectedLater: (t.collectedLater ?? 0) + amount, updatedAt: now });
    }
    const n = (counter.exists ? counter.data().next : 1) ?? 1;
    tx.set(counterRef, { next: n + 1 });
    tx.set(payRef, {
      number: receiptNumber(n), branchId: t.branchId, targetType: input.targetType, targetId: input.targetId, targetNumber: t.number ?? "",
      customerName: t.customerName ?? "", customerPhone: t.customerPhone ?? "", amount, method: input.method, reference: input.reference,
      balanceAfter: applied.dueAmount, allocations, createdBy: ctx.user.uid, createdAt: now,
    });
    tx.set(keyRef, { type: "PAYMENT", refId: payRef.id, actorUid: ctx.user.uid, createdAt: now });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "PAYMENT_COLLECTED", actorUid: ctx.user.uid, targetType: input.targetType.toLowerCase(), targetId: input.targetId, createdAt: now,
      detail: { amount, method: input.method, balanceAfter: applied.dueAmount },
    });
  });
  return { id: resultId, duplicate };
}
