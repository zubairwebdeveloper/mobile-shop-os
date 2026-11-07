/** PURE CRM, warranty and repair rules (no database): unit-testable. */

/** Digits only, Pakistan-friendly: 0300 1234567, +92 300 1234567 and 3001234567 all become 923001234567. Null if not plausible. */
export function normalizePhone(input) {
  let d = String(input ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = `92${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith("3")) d = `92${d}`;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

const pad = (n) => String(n).padStart(2, "0");
export function isValidDateStr(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** "2026-01-31" + 1 month = "2026-02-28" (day clamps to the end of the month). */
export function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = m - 1 + months;
  const year = y + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad(month + 1)}-${pad(Math.min(d, last))}`;
}

export function daysBetween(fromStr, toStr) {
  const [a, b] = [fromStr, toStr].map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86400000);
}

/** A warranty is covered on its expiry date and expires the day after. VOIDED always wins. */
export function warrantyState({ status, expiryDate }, today) {
  if (status === "VOIDED") return { state: "VOIDED", daysLeft: 0 };
  const left = daysBetween(today, expiryDate);
  return left < 0 ? { state: "EXPIRED", daysLeft: 0 } : { state: "ACTIVE", daysLeft: left };
}

export const warrantyDocId = (saleId, unitKey) => `${saleId}_${unitKey}`;

export const REPAIR_STATUSES = ["RECEIVED", "DIAGNOSING", "WAITING_FOR_PARTS", "IN_PROGRESS", "READY", "DELIVERED", "CANCELLED"];
export const REPAIR_TRANSITIONS = {
  RECEIVED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["WAITING_FOR_PARTS", "IN_PROGRESS", "READY", "CANCELLED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_PARTS", "READY", "CANCELLED"],
  READY: ["IN_PROGRESS", "DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};
export const canTransition = (from, to) => (REPAIR_TRANSITIONS[from] ?? []).includes(to);
export const PARTS_EDITABLE = ["DIAGNOSING", "WAITING_FOR_PARTS", "IN_PROGRESS"];
export const repairNumber = (n) => `REP-${String(n).padStart(6, "0")}`;
export const MAX_REPAIR_PARTS = 30;

export function repairTotals({ labourCharge = 0, parts = [] }) {
  const partsTotal = parts.reduce((a, p) => a + p.unitPrice * p.quantity, 0);
  return { partsTotal, total: labourCharge + partsTotal };
}

/** Money at hand-over. Warranty repairs are free. Unpaid balance needs a named customer. Overpaying is refused (no change tracking here). */
export function settleDelivery({ total, collected, underWarranty, hasCustomer }) {
  const finalCost = underWarranty ? 0 : total;
  const paid = underWarranty ? 0 : collected;
  if (paid < 0) return { ok: false, code: "BAD_AMOUNT", message: "The amount cannot be negative." };
  if (paid > finalCost) return { ok: false, code: "OVERPAYMENT", message: "The amount collected is more than the final cost." };
  const due = finalCost - paid;
  if (due > 0 && !hasCustomer) return { ok: false, code: "CUSTOMER_REQUIRED", message: "Link a customer to leave a balance unpaid." };
  return { ok: true, finalCost, collected: paid, dueAmount: due };
}

/** Customer summary from the customer's sales and repair jobs (already filtered to what the viewer may see). */
export function customerStats({ sales = [], repairs = [] }) {
  const live = sales;
  return {
    salesCount: live.length,
    lifetimeValue: live.reduce((a, s) => a + s.total - (s.refundedTotal ?? 0), 0),
    outstanding: live.reduce((a, s) => a + (s.dueAmount ?? 0), 0) + repairs.reduce((a, r) => a + (r.dueAmount ?? 0), 0),
    lastPurchaseAt: live.reduce((latest, s) => (!latest || (s.createdAt ?? "") > latest ? s.createdAt ?? latest : latest), null),
  };
}
