import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { dayKey } from "@/lib/sales/pure";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { getShopSettings } from "@/lib/tenant/settings";
import { branchScopes, getAllById } from "./data";
import { buildSchedule, effectiveSchedule, planNumber, scheduleStatus } from "./pure";

/**
 * Installment plans. One plan per credit sale (document id = sale id). No interest or markup: the plan only spreads the sale's
 * unpaid balance. The sale's dueAmount stays the single source of truth; the schedule shrinks from the end if a return cancels debt.
 * Overdue = an unpaid installment whose due date is before today in the shop's timezone. No late fees are charged.
 */

function view(id, p, saleDue, today) {
  const eff = effectiveSchedule(p.schedule ?? [], saleDue);
  const status = scheduleStatus(eff, today);
  return {
    id, number: p.number, saleId: id, saleNumber: p.saleNumber, branchId: p.branchId, customerId: p.customerId ?? null,
    customerName: p.customerName ?? "", customerPhone: p.customerPhone ?? "", frequency: p.frequency, count: p.count,
    principal: p.principal, status: p.status === "ACTIVE" && status.state === "COMPLETED" ? "COMPLETED" : p.status,
    saleDue, today, schedule: eff, ...status, createdAt: iso(p.createdAt),
  };
}

export async function createPlan(ctx, input) {
  const { timezone } = await getShopSettings(ctx);
  const today = dayKey(new Date(), timezone);
  if (input.firstDueDate < today) throw conflict("DATE_IN_PAST", "The first due date cannot be in the past.");
  const saleRef = docRef(ctx, "sales", input.saleId);
  const planRef = docRef(ctx, "installments", input.saleId);
  const counterRef = docRef(ctx, "counters", "installments");

  await adminDb().runTransaction(async (tx) => {
    const [sale, plan, counter] = await Promise.all([tx.get(saleRef), tx.get(planRef), tx.get(counterRef)]);
    if (!sale.exists || !mayUseBranch(ctx, sale.data().branchId)) throw notFound("Sale not found.");
    const s = sale.data();
    assertBranch(ctx, s.branchId);
    if (plan.exists) throw conflict("PLAN_EXISTS", "This sale already has an installment plan.");
    if (!s.customerId) throw conflict("CUSTOMER_REQUIRED", "Link a saved customer to the sale before making an installment plan.");
    if ((s.dueAmount ?? 0) <= 0) throw conflict("NOTHING_DUE", "This sale has no balance to spread.");
    const built = buildSchedule({ principal: s.dueAmount, count: input.count, firstDueDate: input.firstDueDate, frequency: input.frequency });
    if (!built.ok) throw conflict(built.code, built.message);
    const n = (counter.exists ? counter.data().next : 1) ?? 1;
    const now = FieldValue.serverTimestamp();
    tx.set(counterRef, { next: n + 1 });
    tx.set(planRef, {
      number: planNumber(n), saleId: input.saleId, saleNumber: s.number, branchId: s.branchId, customerId: s.customerId,
      customerName: s.customerName ?? "", customerPhone: s.customerPhone ?? "", frequency: input.frequency, count: input.count,
      principal: s.dueAmount, schedule: built.rows, status: "ACTIVE", createdBy: ctx.user.uid, createdAt: now,
    });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "INSTALLMENT_PLAN_CREATED", actorUid: ctx.user.uid, targetType: "installment", targetId: input.saleId, createdAt: now,
      detail: { count: input.count, frequency: input.frequency, principal: s.dueAmount },
    });
  });
  return { id: input.saleId };
}

export async function getPlan(ctx, saleId) {
  if (!isSafeId(saleId)) return null;
  const [snap, sale] = await Promise.all([docRef(ctx, "installments", saleId).get(), docRef(ctx, "sales", saleId).get()]);
  if (!snap.exists || !sale.exists || !mayUseBranch(ctx, snap.data().branchId)) return null;
  const { timezone } = await getShopSettings(ctx);
  return view(saleId, snap.data(), sale.data().dueAmount ?? 0, dayKey(new Date(), timezone));
}

/** Active plans with overdue first. Capped; a shop with more open plans than this sees the most overdue 500. */
export async function listActivePlans(ctx, { branchId } = {}) {
  const scopes = branchScopes(ctx, branchId);
  const snaps = await Promise.all(
    scopes.map((b) => (b ? col(ctx, "installments").where("branchId", "==", b) : col(ctx, "installments")).where("status", "==", "ACTIVE").limit(500).get()),
  );
  const docs = snaps.flatMap((s) => s.docs);
  const sales = await getAllById(ctx, "sales", docs.map((d) => d.id));
  const dueById = new Map(sales.filter((s) => s.exists).map((s) => [s.id, s.data().dueAmount ?? 0]));
  const { timezone } = await getShopSettings(ctx);
  const today = dayKey(new Date(), timezone);
  const rows = docs.map((d) => view(d.id, d.data(), dueById.get(d.id) ?? 0, today));
  const rank = { OVERDUE: 0, CURRENT: 1, COMPLETED: 2 };
  rows.sort((a, b) => rank[a.state] - rank[b.state] || b.maxDaysLate - a.maxDaysLate || (a.nextDue?.dueDate ?? "9").localeCompare(b.nextDue?.dueDate ?? "9"));
  return { today, plans: rows };
}
