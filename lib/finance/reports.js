import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { rupeesToPaisa } from "@/lib/catalog/pure";
import { assertBranch, col, iso } from "@/lib/inventory/common";
import { dayKey } from "@/lib/sales/pure";
import { pagedList } from "@/lib/sales/sales";
import { getShopSettings } from "@/lib/tenant/settings";
import { badRequest } from "@/lib/security/errors";
import { getAllById, owingDocs, periodWindow, windowDocs } from "./data";
import { listActivePlans } from "./installments";
import { listPayables } from "./payables";
import { computeReport, reconcileDifference } from "./pure";

/**
 * The finance report (finance:read). Revenue, gross profit, net profit and cash movement are SEPARATE numbers.
 * Cost of goods comes from the cost recorded at sale time; sales with no known cost are counted and flagged, never guessed.
 */

const sumCost = (items) => (!items || items.some((i) => i.costTotal == null) ? null : items.reduce((a, i) => a + i.costTotal, 0));

export async function loadPeriod(ctx, { from, to, branchId }) {
  const { start, end } = await periodWindow(ctx, { from, to });
  const [salesDocs, returnDocs, repairDocs, expenseDocs, payDocs, spayDocs] = await Promise.all([
    windowDocs(ctx, "sales", "createdAt", start, end, branchId),
    windowDocs(ctx, "returns", "createdAt", start, end, branchId, { cap: 2000 }),
    windowDocs(ctx, "repairJobs", "deliveredAt", start, end, branchId, { cap: 2000 }),
    windowDocs(ctx, "expenses", "date", from, to, branchId, { inclusive: true, cap: 2000 }),
    windowDocs(ctx, "payments", "createdAt", start, end, branchId),
    windowDocs(ctx, "supplierPayments", "createdAt", start, end, branchId, { cap: 2000 }),
  ]);
  const costDocs = await getAllById(ctx, "saleCosts", salesDocs.map((d) => d.id));
  const repairCostDocs = await getAllById(ctx, "repairCosts", repairDocs.map((d) => d.id));
  const repairCosts = new Map(repairCostDocs.filter((c) => c.exists).map((c) => [c.id, c.data().costs ?? {}]));
  const costById = new Map(costDocs.filter((c) => c.exists).map((c) => [c.id, sumCost(c.data().items)]));
  return {
    sales: salesDocs.map((d) => ({ ...d.data(), costTotal: costById.has(d.id) ? costById.get(d.id) : null })),
    returns: returnDocs.map((d) => ({ ...d.data(), taxRefund: d.data().taxRefund ?? 0, costReversed: d.data().costReversed ?? 0 })),
    repairs: repairDocs.map((d) => {
      const r = d.data();
      const parts = r.parts ?? [];
      const costs = repairCosts.get(d.id) ?? {};
      const known = parts.every((p) => costs[p.id] != null);
      return { branchId: r.branchId, finalCost: r.finalCost ?? 0, partsCost: known ? parts.reduce((a, p) => a + costs[p.id] * p.quantity, 0) : null, collected: r.collected ?? 0, collectionMethod: r.collectionMethod };
    }),
    expenses: expenseDocs.map((d) => d.data()).filter((e) => e.status === "ACTIVE"),
    collections: payDocs.map((d) => d.data()),
    supplierPayments: spayDocs.map((d) => d.data()),
  };
}

/** Balances as of now (not period figures). */
export async function currentPosition(ctx, branchId) {
  const [saleDocs, repairDocs, payables, plans] = await Promise.all([
    owingDocs(ctx, "sales", branchId), owingDocs(ctx, "repairJobs", branchId), listPayables(ctx, { branchId }), listActivePlans(ctx, { branchId }),
  ]);
  const sum = (docs) => docs.reduce((a, d) => a + (d.data().dueAmount ?? 0), 0);
  const overdue = plans.plans.filter((p) => p.state === "OVERDUE");
  return {
    receivables: { sales: sum(saleDocs), repairs: sum(repairDocs), total: sum(saleDocs) + sum(repairDocs), customersOwing: saleDocs.length + repairDocs.length },
    payables: { total: payables.total },
    installments: { activePlans: plans.plans.length, overduePlans: overdue.length, overdueAmount: overdue.reduce((a, p) => a + p.overdueAmount, 0) },
  };
}

export async function financeReport(ctx, { from, to, branchId }) {
  const [data, position] = await Promise.all([loadPeriod(ctx, { from, to, branchId }), currentPosition(ctx, branchId)]);
  const { timezone } = await getShopSettings(ctx);
  return { period: { from, to, timezone, branchId: branchId ?? null, generatedOn: dayKey(new Date(), timezone) }, ...computeReport(data), position };
}

export async function receivables(ctx, { branchId } = {}) {
  const [s, r] = await Promise.all([owingDocs(ctx, "sales", branchId), owingDocs(ctx, "repairJobs", branchId)]);
  const rows = [
    ...s.map((d) => ({ type: "SALE", id: d.id, number: d.data().number, branchId: d.data().branchId, customerName: d.data().customerName ?? "", customerPhone: d.data().customerPhone ?? "", dueAmount: d.data().dueAmount, createdAt: iso(d.data().createdAt) })),
    ...r.map((d) => ({ type: "REPAIR", id: d.id, number: d.data().number, branchId: d.data().branchId, customerName: d.data().customerName ?? "", customerPhone: d.data().customerPhone ?? "", dueAmount: d.data().dueAmount, createdAt: iso(d.data().createdAt) })),
  ].sort((a, b) => b.dueAmount - a.dueAmount);
  return { total: rows.reduce((a, x) => a + x.dueAmount, 0), rows: rows.slice(0, 200), truncated: rows.length > 200 };
}

/* ---------- reconciliation: our records vs a bank / wallet statement the user types in ---------- */

const serializeRecon = (d) => ({ id: d.id, ...d.data(), createdAt: iso(d.data().createdAt) });
export const listReconciliations = (ctx, opts) => pagedList(ctx, "reconciliations", serializeRecon, opts);

export async function createReconciliation(ctx, input) {
  if (!ctx.allBranches && !input.branchId) throw badRequest("Choose a branch.");
  if (input.branchId) assertBranch(ctx, input.branchId);
  const data = await loadPeriod(ctx, { from: input.from, to: input.to, branchId: input.branchId });
  const rep = computeReport(data);
  const systemNet = rep.cash.netByMethod[input.method] ?? 0;
  const statementTotal = (rupeesToPaisa(input.statementTotal.replace("-", "")) ?? 0) * (input.statementTotal.startsWith("-") ? -1 : 1);
  const ref = col(ctx, "reconciliations").doc();
  const now = FieldValue.serverTimestamp();
  const row = {
    method: input.method, from: input.from, to: input.to, branchId: input.branchId ?? "ALL", systemNet, statementTotal,
    difference: reconcileDifference(statementTotal, systemNet), note: input.note, createdBy: ctx.user.uid, createdAt: now,
  };
  await ref.create(row);
  await col(ctx, "auditLogs").add({ action: "RECONCILED", actorUid: ctx.user.uid, targetType: "reconciliation", targetId: ref.id, createdAt: now, detail: { method: input.method, difference: row.difference } });
  return { id: ref.id, systemNet, statementTotal, difference: row.difference };
}
