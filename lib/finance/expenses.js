import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { rupeesToPaisa } from "@/lib/catalog/pure";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { pagedList } from "@/lib/sales/sales";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { expenseNumber } from "./pure";

/** Shop expenses. Never deleted: a wrong entry is VOIDED with a reason and stops counting. Needs finance:write / finance:read. */

export const serializeExpense = (d) => {
  const e = d.data();
  return {
    id: d.id, number: e.number, branchId: e.branchId, branchName: e.branchName ?? "", category: e.category, amount: e.amount, date: e.date,
    method: e.method, paidTo: e.paidTo ?? "", note: e.note ?? "", status: e.status, voidReason: e.voidReason ?? "",
    createdBy: e.createdBy ?? null, createdAt: iso(e.createdAt),
  };
};

export const listExpenses = (ctx, opts) => pagedList(ctx, "expenses", serializeExpense, opts);

export async function createExpense(ctx, input) {
  assertBranch(ctx, input.branchId);
  const ref = col(ctx, "expenses").doc();
  const counterRef = docRef(ctx, "counters", "expenses");
  await adminDb().runTransaction(async (tx) => {
    const [branch, counter] = await Promise.all([tx.get(docRef(ctx, "branches", input.branchId)), tx.get(counterRef)]);
    if (!branch.exists) throw notFound("Branch not found.");
    const n = (counter.exists ? counter.data().next : 1) ?? 1;
    const now = FieldValue.serverTimestamp();
    tx.set(counterRef, { next: n + 1 });
    tx.set(ref, {
      number: expenseNumber(n), branchId: input.branchId, branchName: branch.data().name ?? "", category: input.category,
      amount: rupeesToPaisa(input.amount), date: input.date, method: input.method, paidTo: input.paidTo, note: input.note,
      status: "ACTIVE", createdBy: ctx.user.uid, createdAt: now,
    });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "EXPENSE_CREATED", actorUid: ctx.user.uid, targetType: "expense", targetId: ref.id, createdAt: now,
      detail: { category: input.category, amount: rupeesToPaisa(input.amount), date: input.date },
    });
  });
  return { id: ref.id };
}

export async function voidExpense(ctx, id, { reason }) {
  if (!isSafeId(id)) throw notFound("Expense not found.");
  const ref = docRef(ctx, "expenses", id);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) throw notFound("Expense not found.");
    assertBranch(ctx, snap.data().branchId);
    if (snap.data().status !== "ACTIVE") throw conflict("ALREADY_VOID", "This expense is already voided.");
    const now = FieldValue.serverTimestamp();
    tx.update(ref, { status: "VOIDED", voidReason: reason, voidedBy: ctx.user.uid, voidedAt: now, updatedAt: now });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "EXPENSE_VOIDED", actorUid: ctx.user.uid, targetType: "expense", targetId: id, createdAt: now, detail: { reason },
    });
  });
  return { ok: true };
}
