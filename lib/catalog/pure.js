/**
 * PURE catalogue helpers (no database, no Next.js): unit-testable.
 */

/** Removes spaces and hyphens people type or scanners add. */
export function normalizeImei(value) {
  return String(value ?? "").replace(/[\s-]/g, "");
}

/** Luhn check over a string of digits. */
export function luhnValid(digits) {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * IMEI format check: exactly 15 digits and a valid Luhn check digit.
 * This proves the NUMBER is well formed. It does NOT prove the device is genuine, unblocked or PTA approved.
 */
export function isValidImei(value) {
  const imei = normalizeImei(value);
  return /^\d{15}$/.test(imei) && luhnValid(imei);
}

/** Barcodes/SKUs: trimmed, no inner whitespace, limited charset (usable as a document id: no slashes, no leading punctuation). Returns "" when empty/invalid. */
export function normalizeBarcode(value) {
  const code = String(value ?? "").trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(code) ? code.toUpperCase() : "";
}

/** What a scanned/typed code could be. 15 valid digits are treated as an IMEI first. */
export function classifyCode(value) {
  const imei = normalizeImei(value);
  if (/^\d{15}$/.test(imei) && luhnValid(imei)) return { kind: "IMEI", code: imei };
  const barcode = normalizeBarcode(value);
  if (barcode) return { kind: "BARCODE", code: barcode };
  return { kind: "INVALID", code: "" };
}

/** Whole rupees (string) -> integer paisa. Empty -> null. */
export function rupeesToPaisa(value) {
  if (value === "" || value == null) return null;
  return Number(value) * 100;
}

export function paisaToRupees(paisa) {
  return paisa == null ? "" : String(Math.round(paisa / 100));
}

/** Stored variant document from validated form input. */
export function buildVariantDoc(input) {
  return {
    sku: input.sku ? normalizeBarcode(input.sku) || null : null,
    barcode: input.barcode ? normalizeBarcode(input.barcode) || null : null,
    storage: input.storage || "",
    ram: input.ram || "",
    color: input.color || "",
    purchasePrice: rupeesToPaisa(input.purchasePrice),
    sellingPrice: rupeesToPaisa(input.sellingPrice),
    wholesalePrice: rupeesToPaisa(input.wholesalePrice),
    minStock: input.minStock ?? 0,
    status: input.status ?? "ACTIVE",
  };
}

export function variantLabel(variant) {
  return [variant.ram && `${variant.ram} RAM`, variant.storage, variant.color].filter(Boolean).join(" · ") || "Standard";
}

/** Case-insensitive match over several fields (used by list filters). */
export function matchesQuery(query, ...fields) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q));
}
