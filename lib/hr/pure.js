/**
 * PURE staff rules (no database): attendance summary, leave, sales attribution, commission and targets.
 * Money is integer paisa. Dates are shop-local "YYYY-MM-DD" strings.
 * Commission is a percentage of NET SALES (after returns, without tax). It is never based on profit, because purchase cost is private.
 */
import { isValidDateStr } from "../customers/pure.js";

export const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "HALF_DAY", "ABSENT", "LEAVE"];
export const LEAVE_TYPES = ["ANNUAL", "SICK", "CASUAL", "UNPAID", "OTHER"];
export const MAX_COMMISSION_PERCENT = 20;
export const MAX_EMPLOYEES = 300;

export const isValidMonth = (m) => typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function datesBetween(from, to) {
  const out = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end && out.length < 400; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export const leaveDays = (from, to) => datesBetween(from, to).length;
export const rangesOverlap = (a, b) => a.from <= b.to && b.from <= a.to;

export function validateLeaveRange(from, to) {
  if (!isValidDateStr(from) || !isValidDateStr(to)) return { ok: false, message: "Use real dates." };
  if (from > to) return { ok: false, message: "The end date is before the start date." };
  if (leaveDays(from, to) > 90) return { ok: false, message: "A leave request can cover at most 90 days." };
  return { ok: true };
}

/** "5", "2.5" -> basis points (500, 250). Whole numbers or up to 2 decimals, 0 to MAX_COMMISSION_PERCENT. */
export function ratePercentToBps(text) {
  if (typeof text !== "string" || !/^\d{1,2}(\.\d{1,2})?$/.test(text.trim())) return null;
  const [w, f = ""] = text.trim().split(".");
  const bps = Number(w) * 100 + Number(f.padEnd(2, "0"));
  return bps <= MAX_COMMISSION_PERCENT * 100 ? bps : null;
}

/**
 * One month for one employee. An explicit attendance mark wins; otherwise a day inside an APPROVED leave counts as LEAVE;
 * otherwise a past day is "unmarked" (never assumed present or absent). Days before the join date and after `today` are ignored.
 * rate = (present + late + half-day x 0.5) / marked days excluding leave.
 */
export function attendanceSummary({ month, today, records = [], leaves = [], joinDate = null }) {
  const { from, to } = monthRange(month);
  const byDate = new Map(records.map((r) => [r.date, r.status]));
  const counts = { PRESENT: 0, LATE: 0, HALF_DAY: 0, ABSENT: 0, LEAVE: 0 };
  let unmarked = 0;
  for (const d of datesBetween(from, to)) {
    if (d > today || (joinDate && d < joinDate)) continue;
    const explicit = byDate.get(d);
    if (explicit) counts[explicit] += 1;
    else if (leaves.some((l) => l.status === "APPROVED" && l.from <= d && d <= l.to)) counts.LEAVE += 1;
    else unmarked += 1;
  }
  const worked = counts.PRESENT + counts.LATE + counts.HALF_DAY * 0.5;
  const counted = counts.PRESENT + counts.LATE + counts.HALF_DAY + counts.ABSENT;
  return { ...counts, unmarked, rate: counted === 0 ? null : Math.round((worked / counted) * 1000) / 10 };
}

/** Sales value of one invoice for performance: total minus tax, minus refunds (also without their tax). Returns are charged back to the original sale. */
export function saleNetExTax(sale) {
  let net = 0;
  for (const i of sale.items ?? []) {
    const taxShare = i.taxShare ?? 0;
    const refunded = i.refundedAmount ?? 0;
    const refundTax = i.lineTotal > 0 ? Math.round((refunded * taxShare) / i.lineTotal) : 0;
    net += i.lineTotal - taxShare - (refunded - refundTax);
  }
  return net;
}

/** Whole-rupee commission, rounded down. A negative base (returns after the sale month) pays nothing. */
export function commissionFor(netSales, bps) {
  if (!Number.isInteger(netSales) || !Number.isInteger(bps) || netSales <= 0 || bps <= 0) return 0;
  return Math.floor((netSales * bps) / 10000 / 100) * 100;
}

export const targetProgress = (net, target) => (!target || target <= 0 ? null : Math.max(0, Math.round((net / target) * 100)));

/** Per-seller totals. `employeeByUid` maps member uid -> employee id; others fall under "unlinked". */
export function salesByEmployee(sales, employeeByUid) {
  const out = new Map();
  for (const s of sales) {
    const key = employeeByUid.get(s.createdBy) ?? "unlinked";
    const row = out.get(key) ?? { employeeId: key, salesCount: 0, netSales: 0 };
    row.salesCount += 1;
    row.netSales += saleNetExTax(s);
    out.set(key, row);
  }
  return out;
}

/** One branch for a period. All inputs are already limited to that branch and period. */
export function branchPerformance({ sales = [], returns = [], repairs = [], attendance = [] }) {
  const netSales = sales.reduce((a, s) => a + saleNetExTax(s), 0);
  const grossSales = sales.reduce((a, s) => a + s.total - (s.taxAmount ?? 0), 0);
  const refundTotal = returns.reduce((a, r) => a + r.refundAmount, 0);
  const worked = attendance.reduce((a, r) => a + (r.status === "PRESENT" || r.status === "LATE" ? 1 : r.status === "HALF_DAY" ? 0.5 : 0), 0);
  const counted = attendance.filter((r) => r.status !== "LEAVE").length;
  return {
    salesCount: sales.length,
    netSales,
    averageSale: sales.length ? Math.floor(grossSales / sales.length / 100) * 100 : 0,
    returnsCount: returns.length,
    refundTotal,
    repairsDelivered: repairs.length,
    repairRevenue: repairs.reduce((a, r) => a + (r.finalCost ?? 0), 0),
    attendanceRate: counted === 0 ? null : Math.round((worked / counted) * 1000) / 10,
  };
}
