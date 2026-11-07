/**
 * PURE sales rules (no database, no Next.js): unit-testable. Services call these inside transactions.
 * Money is integer paisa and every amount in a sale is a whole number of rupees (multiple of 100),
 * so cashiers can always type payments that match the total exactly.
 */

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "JAZZCASH", "EASYPAISA", "EXCHANGE_CREDIT"];
export const REFUND_METHODS = ["CASH", "BANK_TRANSFER", "JAZZCASH", "EASYPAISA", "EXCHANGE_CREDIT"];
export const MAX_SALE_LINES = 50;
export const MAX_SALE_IMEI_UNITS = 40;
export const MAX_TAX_BPS = 3000;
const RUPEE = 100;

export const invoiceNumber = (n) => `INV-${String(n).padStart(6, "0")}`;

/** "17.5" -> 1750 basis points. Returns null when malformed or above 30%. */
export function taxPercentToBps(value) {
  const text = String(value ?? "0").trim() || "0";
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(text)) return null;
  const bps = Math.round(Number(text) * 100);
  return bps <= MAX_TAX_BPS ? bps : null;
}

/** Splits `totalRupees` (integer) across weights by largest remainder; the parts always add up exactly. */
export function allocate(totalRupees, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalRupees <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (totalRupees * w) / sum);
  const parts = exact.map(Math.floor);
  let left = totalRupees - parts.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    parts[i] += 1;
    left -= 1;
  }
  return parts;
}

const fail = (code, message) => ({ ok: false, code, message });

/**
 * lines: [{ unitPrice, quantity, discount }]  (paisa, whole rupees)   orderDiscount: paisa   taxBps: integer
 * Returns { ok, lines: [{ gross, lineDiscount, net, orderDiscountShare, taxShare, lineTotal }], subtotal,
 * lineDiscountTotal, orderDiscount, taxableAmount, taxAmount, total }. Sum of lineTotal === total.
 */
export function computeSale({ lines, orderDiscount = 0, taxBps = 0 }) {
  if (!Array.isArray(lines) || lines.length === 0) return fail("NO_LINES", "Add at least one item.");
  const base = lines.map((l) => {
    const gross = l.unitPrice * l.quantity;
    return { gross, lineDiscount: l.discount ?? 0, net: gross - (l.discount ?? 0) };
  });
  if (base.some((l) => l.lineDiscount < 0 || l.net < 0)) return fail("DISCOUNT_TOO_LARGE", "A line discount is larger than the line amount.");
  const netTotal = base.reduce((a, l) => a + l.net, 0);
  if (orderDiscount < 0 || orderDiscount > netTotal) return fail("DISCOUNT_TOO_LARGE", "The discount is larger than the amount.");

  const taxable = netTotal - orderDiscount;
  const taxAmount = Math.floor((taxable * taxBps) / 10000 / RUPEE + 0.5) * RUPEE;
  const total = taxable + taxAmount;
  if (total <= 0) return fail("TOTAL_ZERO", "The total must be more than zero.");

  const discShares = allocate(orderDiscount / RUPEE, base.map((l) => l.net)).map((x) => x * RUPEE);
  const taxShares = allocate(taxAmount / RUPEE, base.map((l, i) => l.net - discShares[i])).map((x) => x * RUPEE);
  const out = base.map((l, i) => ({
    ...l,
    orderDiscountShare: discShares[i],
    taxShare: taxShares[i],
    lineTotal: l.net - discShares[i] + taxShares[i],
  }));
  return {
    ok: true,
    lines: out,
    subtotal: base.reduce((a, l) => a + l.gross, 0),
    lineDiscountTotal: base.reduce((a, l) => a + l.lineDiscount, 0),
    orderDiscount,
    taxableAmount: taxable,
    taxAmount,
    total,
  };
}

/**
 * payments: [{ method, amount, reference?, exchangeId? }] (paisa). Cash may be handed over in excess: the excess is change
 * and is NOT recorded as received. Anything unpaid is credit (needs a named customer).
 */
export function settlePayments(total, payments, { hasCustomer }) {
  if (payments.length > 5) return fail("TOO_MANY_PAYMENTS", "At most 5 payment lines.");
  const methods = new Set();
  for (const p of payments) {
    if (!PAYMENT_METHODS.includes(p.method)) return fail("BAD_METHOD", "Unknown payment method.");
    if (!Number.isInteger(p.amount) || p.amount <= 0) return fail("BAD_AMOUNT", "Payment amounts must be more than zero.");
    if (methods.has(p.method)) return fail("DUPLICATE_METHOD", "Use each payment method once.");
    methods.add(p.method);
    if (p.method === "EXCHANGE_CREDIT" && !p.exchangeId) return fail("EXCHANGE_REQUIRED", "Choose the exchange credit to use.");
  }
  const sum = payments.reduce((a, p) => a + p.amount, 0);
  const settled = payments.map((p) => ({ ...p }));
  let change = 0;
  if (sum > total) {
    change = sum - total;
    const cash = settled.find((p) => p.method === "CASH");
    if (!cash || cash.amount < change) {
      return fail("OVERPAYMENT", "Payments are more than the total. Only cash can be overpaid (change is returned).");
    }
    cash.amount -= change;
  }
  const kept = settled.filter((p) => p.amount > 0);
  const paid = kept.reduce((a, p) => a + p.amount, 0);
  const due = total - paid;
  if (due > 0 && !hasCustomer) return fail("CUSTOMER_REQUIRED", "Enter the customer's name and phone to sell on credit.");
  return {
    ok: true,
    payments: kept,
    paidAmount: paid,
    dueAmount: due,
    changeGiven: change,
    paymentStatus: due === 0 ? "PAID" : paid === 0 ? "UNPAID" : "PARTIAL",
  };
}

/** Refund for returning `k` units of a sale line. The final unit takes the rounding remainder, so a full return refunds exactly what was paid. */
export function refundForUnits(item, k) {
  const already = item.refundedAmount ?? 0;
  const returned = item.returnedQty ?? 0;
  if (returned + k >= item.quantity) return item.lineTotal - already;
  return Math.floor((item.lineTotal * k) / item.quantity / RUPEE) * RUPEE;
}

export function saleStatusAfterReturn(items) {
  const returned = items.reduce((a, i) => a + (i.returnedQty ?? 0), 0);
  if (returned === 0) return "COMPLETED";
  return items.every((i) => (i.returnedQty ?? 0) >= i.quantity) ? "RETURNED" : "PARTIALLY_RETURNED";
}

/** A refund first cancels any unpaid balance on a credit sale; only the rest is paid out. */
export function splitRefund(refundAmount, dueAmount) {
  const dueReduction = Math.min(refundAmount, dueAmount ?? 0);
  return { dueReduction, payout: refundAmount - dueReduction };
}

/* ---------- Daily closing ---------- */

function offsetMs(instantMs, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(instantMs)).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/** "YYYY-MM-DD" of an instant in a time zone. */
export function dayKey(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** UTC [start, end) of a local calendar day in a time zone. */
export function dayRangeUtc(dateStr, timeZone) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const localMidnight = (day) => {
    const t0 = Date.UTC(y, m - 1, day);
    const first = t0 - offsetMs(t0, timeZone);
    return t0 - offsetMs(first, timeZone);
  };
  return { start: new Date(localMidnight(d)), end: new Date(localMidnight(d + 1)) };
}

/** Totals for a branch-day from its sales and returns (already filtered to that branch and day). */
export function closingTotals({ sales, returns, openingCash = 0, collections = [], expenses = [], supplierPayments = [], repairs = [] }) {
  const byMethod = {};
  let salesTotal = 0;
  let dueTotal = 0;
  for (const s of sales) {
    salesTotal += s.total;
    dueTotal += s.dueAmount ?? 0;
    for (const p of s.payments ?? []) byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
  }
  const refundsByMethod = {};
  let refundTotal = 0;
  for (const r of returns) {
    refundTotal += r.refundAmount;
    if (r.payout > 0) refundsByMethod[r.refundMethod] = (refundsByMethod[r.refundMethod] ?? 0) + r.payout;
  }
  const collectionsByMethod = {};
  for (const c of collections) collectionsByMethod[c.method] = (collectionsByMethod[c.method] ?? 0) + c.amount;
  const repairCash = repairs.filter((r) => r.collectionMethod === "CASH").reduce((a, r) => a + (r.collected ?? 0), 0);
  const expensesCash = expenses.filter((e) => (e.method ?? "CASH") === "CASH").reduce((a, e) => a + e.amount, 0);
  const supplierCash = supplierPayments.filter((p) => p.method === "CASH").reduce((a, p) => a + p.amount, 0);
  const cashIn = (byMethod.CASH ?? 0) + (collectionsByMethod.CASH ?? 0) + repairCash;
  const cashOut = (refundsByMethod.CASH ?? 0) + expensesCash + supplierCash;
  return {
    salesCount: sales.length,
    salesTotal,
    dueTotal,
    refundTotal,
    byMethod,
    refundsByMethod,
    collectionsByMethod,
    repairCash,
    expensesCash,
    supplierCash,
    openingCash,
    expectedCash: openingCash + cashIn - cashOut,
  };
}
