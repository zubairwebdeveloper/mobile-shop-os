/**
 * PURE finance rules (no database): installment schedules, payments, payables, the profit report and CSV export.
 * Money is integer paisa; every installment amount is a whole number of rupees.
 * Revenue is NOT profit: the report keeps revenue, gross profit, net profit and cash movement as separate figures.
 */
import { addMonths, daysBetween } from "../customers/pure.js";

export const MIN_INSTALLMENTS = 2;
export const MAX_INSTALLMENTS = 36;
export const COLLECTION_METHODS = ["CASH", "BANK_TRANSFER", "JAZZCASH", "EASYPAISA"];
export const EXPENSE_CATEGORIES = ["RENT", "SALARY", "UTILITIES", "TRANSPORT", "MARKETING", "MAINTENANCE", "SUPPLIES", "TAX_AND_FEES", "OTHER"];
export const receiptNumber = (n) => `RCPT-${String(n).padStart(6, "0")}`;
export const planNumber = (n) => `INS-${String(n).padStart(6, "0")}`;
export const expenseNumber = (n) => `EXP-${String(n).padStart(6, "0")}`;

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Equal whole-rupee installments; leftover rupees go one each to the first installments. Dates repeat from the FIRST date (Jan 31 -> Feb 28 -> Mar 31). */
export function buildSchedule({ principal, count, firstDueDate, frequency }) {
  if (!Number.isInteger(count) || count < MIN_INSTALLMENTS || count > MAX_INSTALLMENTS) return { ok: false, code: "BAD_COUNT", message: `Use ${MIN_INSTALLMENTS} to ${MAX_INSTALLMENTS} installments.` };
  if (!Number.isInteger(principal) || principal % 100 !== 0 || principal < count * 100) return { ok: false, code: "BALANCE_TOO_SMALL", message: "The balance is too small for that many installments." };
  const rupees = principal / 100;
  const base = Math.floor(rupees / count);
  const extra = rupees - base * count;
  const rows = Array.from({ length: count }, (_, i) => ({
    no: i + 1,
    dueDate: frequency === "WEEKLY" ? addDays(firstDueDate, 7 * i) : addMonths(firstDueDate, i),
    amount: (base + (i < extra ? 1 : 0)) * 100,
    paid: 0,
  }));
  return { ok: true, rows };
}

/**
 * The sale's unpaid balance is the truth. If it is lower than what the schedule still expects (a return cancelled part of the
 * debt), the LAST installments shrink. Returns rows with `outstanding`.
 */
export function effectiveSchedule(rows, saleDue) {
  const eff = rows.map((r) => ({ ...r, outstanding: Math.max(0, r.amount - (r.paid ?? 0)) }));
  let excess = eff.reduce((a, r) => a + r.outstanding, 0) - Math.max(0, saleDue);
  for (let i = eff.length - 1; i >= 0 && excess > 0; i -= 1) {
    const cut = Math.min(eff[i].outstanding, excess);
    eff[i].outstanding -= cut;
    excess -= cut;
  }
  return eff;
}

/** Fills the earliest installments first. */
export function allocatePayment(effRows, amount) {
  let left = amount;
  const allocations = [];
  for (const r of effRows) {
    if (left <= 0) break;
    const take = Math.min(r.outstanding, left);
    if (take > 0) {
      allocations.push({ no: r.no, amount: take });
      left -= take;
    }
  }
  return { allocations, leftover: left };
}

export function scheduleStatus(effRows, today) {
  const open = effRows.filter((r) => r.outstanding > 0);
  const overdue = open.filter((r) => r.dueDate < today);
  return {
    outstanding: open.reduce((a, r) => a + r.outstanding, 0),
    overdueAmount: overdue.reduce((a, r) => a + r.outstanding, 0),
    overdueCount: overdue.length,
    maxDaysLate: overdue.length ? daysBetween(overdue[0].dueDate, today) : 0,
    nextDue: open.find((r) => r.dueDate >= today) ?? null,
    state: open.length === 0 ? "COMPLETED" : overdue.length ? "OVERDUE" : "CURRENT",
  };
}

/** Applying a collected payment to a credit sale or repair job. */
export function applyCollection(doc, amount) {
  const due = doc.dueAmount ?? 0;
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, code: "BAD_AMOUNT", message: "Enter an amount more than zero." };
  if (amount > due) return { ok: false, code: "OVERPAYMENT", message: "That is more than the balance due." };
  return { ok: true, dueAmount: due - amount };
}

export const purchaseReceivedValue = (items = []) => items.reduce((a, i) => a + (i.receivedQty ?? 0) * (i.unitCost ?? 0), 0);
/** What we owe the supplier: goods actually received, minus what was already paid. */
export const purchasePayable = (purchase) => Math.max(0, purchaseReceivedValue(purchase.items) - (purchase.paidAmount ?? 0));

/**
 * The finance report. Inputs are already filtered to the period and branch:
 *  sales [{branchId,total,taxAmount,discount,costTotal|null,payments:[{method,amount}]}]
 *  returns [{branchId,refundAmount,taxRefund,costReversed,payout,refundMethod}]
 *  repairs [{branchId,finalCost,partsCost|null,collected,collectionMethod}]
 *  expenses [{branchId,amount,category}]   collections [{branchId,amount,method}]   supplierPayments [{branchId,amount,method}]
 * Tax collected is not revenue. Cost of goods comes from recorded purchase cost; unknown cost is counted, never guessed.
 */
export function computeReport({ sales = [], returns = [], repairs = [], expenses = [], collections = [], supplierPayments = [] }) {
  const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
  const unknownCostSales = sales.filter((s) => s.costTotal == null).length;
  const unknownCostParts = repairs.filter((r) => r.partsCost == null && (r.finalCost ?? 0) > 0).length;

  const salesGross = sum(sales, (s) => s.total);
  const taxCollected = sum(sales, (s) => s.taxAmount ?? 0) - sum(returns, (r) => r.taxRefund ?? 0);
  const salesNet = salesGross - sum(sales, (s) => s.taxAmount ?? 0);
  const refundsNet = sum(returns, (r) => r.refundAmount) - sum(returns, (r) => r.taxRefund ?? 0);
  const netSales = salesNet - refundsNet;
  const repairRevenue = sum(repairs, (r) => r.finalCost ?? 0);
  const revenue = netSales + repairRevenue;
  const cogs = sum(sales, (s) => s.costTotal ?? 0) - sum(returns, (r) => r.costReversed ?? 0);
  const repairPartsCost = sum(repairs, (r) => r.partsCost ?? 0);
  const grossProfit = revenue - cogs - repairPartsCost;
  const expenseTotal = sum(expenses, (e) => e.amount);
  const byCategory = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

  const cashIn = {};
  const cashOut = {};
  const add = (map, method, amount) => {
    if (amount > 0 && method) map[method] = (map[method] ?? 0) + amount;
  };
  for (const s of sales) for (const p of s.payments ?? []) if (p.method !== "EXCHANGE_CREDIT") add(cashIn, p.method, p.amount);
  for (const c of collections) add(cashIn, c.method, c.amount);
  for (const r of repairs) add(cashIn, r.collectionMethod, r.collected ?? 0);
  for (const r of returns) if (r.refundMethod !== "EXCHANGE_CREDIT") add(cashOut, r.refundMethod, r.payout ?? 0);
  for (const e of expenses) add(cashOut, e.method ?? "CASH", e.amount);
  for (const p of supplierPayments) add(cashOut, p.method, p.amount);
  const methods = [...new Set([...Object.keys(cashIn), ...Object.keys(cashOut)])].sort();
  const netByMethod = Object.fromEntries(methods.map((m) => [m, (cashIn[m] ?? 0) - (cashOut[m] ?? 0)]));

  const branches = new Set([...sales, ...returns, ...repairs, ...expenses].map((x) => x.branchId));
  const byBranch = [...branches].sort().map((branchId) => {
    const own = (list) => list.filter((x) => x.branchId === branchId);
    const part = computeReportLite({ sales: own(sales), returns: own(returns), repairs: own(repairs), expenses: own(expenses) });
    return { branchId, ...part };
  });

  return {
    revenue: { salesGross, taxCollected, salesNet, refundsNet, netSales, repairRevenue, total: revenue },
    costs: { cogs, repairPartsCost, unknownCostSales, unknownCostParts },
    grossProfit,
    expenses: { total: expenseTotal, byCategory },
    netProfit: grossProfit - expenseTotal,
    cash: { in: cashIn, out: cashOut, netByMethod, netTotal: sum(Object.values(netByMethod), (x) => x) },
    byBranch,
    counts: { sales: sales.length, returns: returns.length, repairs: repairs.length, expenses: expenses.length },
  };
}

function computeReportLite({ sales, returns, repairs, expenses }) {
  const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
  const revenue = sum(sales, (s) => s.total - (s.taxAmount ?? 0)) - (sum(returns, (r) => r.refundAmount) - sum(returns, (r) => r.taxRefund ?? 0)) + sum(repairs, (r) => r.finalCost ?? 0);
  const gross = revenue - (sum(sales, (s) => s.costTotal ?? 0) - sum(returns, (r) => r.costReversed ?? 0)) - sum(repairs, (r) => r.partsCost ?? 0);
  const exp = sum(expenses, (e) => e.amount);
  return { revenue, grossProfit: gross, expenses: exp, netProfit: gross - exp };
}

/* ---------- CSV (spreadsheet-safe) ---------- */

/** Cells that start with = + - @ (or tab / CR) would run as formulas in Excel; a leading apostrophe makes them text. */
export function csvCell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers, rows) {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export const reconcileDifference = (statementTotal, systemTotal) => statementTotal - systemTotal;
