/**
 * PURE inventory rules (no database, no Next.js): unit-testable. Services call these inside transactions.
 * Quantities are whole units. Money is integer paisa.
 */

export const MAX_PO_LINES = 50;
export const MAX_IMEI_UNITS_PER_ACTION = 40;

export const inventoryId = (variantId, branchId) => `${variantId}_${branchId}`;

export const poNumber = (n) => `PO-${String(n).padStart(6, "0")}`;

/** New quantity after a signed change, or null when it would go below zero. */
export function applyDelta(current, delta) {
  const next = (current ?? 0) + delta;
  return Number.isInteger(next) && next >= 0 ? next : null;
}

export const totalCost = (items) => items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

export const remaining = (item) => item.quantity - (item.receivedQty ?? 0);

/** Status of a purchase that is being received, from its lines. */
export function statusAfterReceipt(items) {
  const rem = items.map(remaining);
  if (rem.every((r) => r === 0)) return "RECEIVED";
  return "PARTIALLY_RECEIVED";
}

/** Parse "imei1" or "imei1, imei2" lines (comma, semicolon or whitespace separated) into pairs. */
export function parseImeiLines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [imei1, imei2 = ""] = line.split(/[\s,;]+/).filter(Boolean);
      return { imei1: imei1 ?? "", imei2 };
    });
}

/**
 * Checks receiving lines against a purchase. `trackedByVariant` maps variantId -> boolean (IMEI-tracked).
 * Returns { ok: true } or { ok: false, code, message }.
 * Rules: every line must be on the purchase; quantity 1..remaining (no over-receipt); IMEI-tracked lines
 * need exactly one IMEI entry per unit; no variant twice; no IMEI repeated inside the request.
 */
export function validateReceiveLines(items, lines, trackedByVariant) {
  if (lines.length === 0) return { ok: false, code: "NO_LINES", message: "Nothing to receive." };
  const seen = new Set();
  const imeis = new Set();
  let imeiUnits = 0;
  for (const line of lines) {
    if (seen.has(line.variantId)) return { ok: false, code: "DUPLICATE_LINE", message: "A product appears twice." };
    seen.add(line.variantId);
    const item = items.find((i) => i.variantId === line.variantId);
    if (!item) return { ok: false, code: "NOT_ON_PURCHASE", message: "A product is not on this purchase order." };
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return { ok: false, code: "BAD_QUANTITY", message: "Quantity must be a whole number of at least 1." };
    }
    if (line.quantity > remaining(item)) {
      return { ok: false, code: "OVER_RECEIPT", message: `${item.productName}: only ${remaining(item)} still to receive.` };
    }
    if (trackedByVariant[line.variantId]) {
      const entries = line.imeis ?? [];
      if (entries.length !== line.quantity) {
        return { ok: false, code: "IMEI_COUNT", message: `${item.productName}: enter exactly ${line.quantity} IMEI(s), one per unit.` };
      }
      imeiUnits += entries.length;
      for (const entry of entries) {
        for (const n of [entry.imei1, entry.imei2].filter(Boolean)) {
          if (imeis.has(n)) return { ok: false, code: "DUPLICATE_IMEI", message: `IMEI ${n} appears twice.` };
          imeis.add(n);
        }
      }
    } else if ((line.imeis ?? []).length > 0) {
      return { ok: false, code: "IMEI_NOT_TRACKED", message: `${item.productName} does not track IMEI.` };
    }
  }
  if (imeiUnits > MAX_IMEI_UNITS_PER_ACTION) {
    return { ok: false, code: "TOO_MANY_UNITS", message: `Receive at most ${MAX_IMEI_UNITS_PER_ACTION} IMEI-tracked units at a time.` };
  }
  return { ok: true };
}

/** Low-stock rows: active variants with minStock > 0 whose total quantity is at or below minStock. */
export function lowStockRows(variants, quantityByVariant) {
  return variants
    .filter((v) => v.status === "ACTIVE" && (v.minStock ?? 0) > 0)
    .map((v) => ({ ...v, quantity: quantityByVariant[v.id] ?? 0 }))
    .filter((v) => v.quantity <= v.minStock)
    .sort((a, b) => a.quantity - b.quantity || a.productName.localeCompare(b.productName));
}

/** Transfer sanity: distinct branches, lines unique, plain-quantity lines positive integers. */
export function validateTransfer({ fromBranchId, toBranchId, items }) {
  if (fromBranchId === toBranchId) return { ok: false, code: "SAME_BRANCH", message: "Choose two different branches." };
  if (items.length === 0) return { ok: false, code: "NO_ITEMS", message: "Add at least one item." };
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.variantId)) return { ok: false, code: "DUPLICATE_LINE", message: "A product appears twice." };
    seen.add(item.variantId);
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { ok: false, code: "BAD_QUANTITY", message: "Quantity must be a whole number of at least 1." };
    }
  }
  return { ok: true };
}

/** What a device's change does to branch stock. Only IN_STOCK devices count. */
export function imeiStockEffect(old, next) {
  const effects = [];
  const wasCounted = old.status === "IN_STOCK";
  const isCounted = next.status === "IN_STOCK";
  if (wasCounted && (!isCounted || old.branchId !== next.branchId)) effects.push({ branchId: old.branchId, delta: -1 });
  if (isCounted && (!wasCounted || old.branchId !== next.branchId)) effects.push({ branchId: next.branchId, delta: 1 });
  return effects;
}
