import { z } from "zod";
import { isSafeId } from "../security/ids.js";
import { MAX_IMEI_UNITS_PER_ACTION, MAX_PO_LINES } from "../inventory/pure.js";
import { isValidImei, normalizeImei } from "../catalog/pure.js";

const safeId = (label) => z.string().refine(isSafeId, `Invalid ${label}`);
const optionalText = (max, label) => z.string().trim().max(max, `${label} is too long`).default("");
const qty = z.coerce.number().int("Whole number").min(1, "At least 1").max(100000, "Too large");

const PHONE = /^\+?[0-9][0-9\s-]{5,18}[0-9]$/;

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80, "Name is too long"),
  phone: z.string().trim().default("").refine((v) => v === "" || PHONE.test(v), "Enter a valid phone number"),
  city: optionalText(60, "City"),
  address: optionalText(200, "Address"),
  notes: optionalText(300, "Notes"),
  active: z.boolean().default(true),
});

const imeiEntry = z.object({
  imei1: z.string().trim().refine(isValidImei, "IMEI: 15 digits with a valid check digit").transform(normalizeImei),
  imei2: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || isValidImei(v), "IMEI 2: 15 digits with a valid check digit")
    .transform((v) => (v === "" ? "" : normalizeImei(v))),
});

export const purchaseCreateSchema = z.object({
  supplierId: safeId("supplier"),
  branchId: safeId("branch"),
  note: optionalText(300, "Note"),
  items: z
    .array(
      z.object({
        variantId: safeId("variant"),
        quantity: qty,
        unitCost: z.string().trim().regex(/^\d{1,9}$/, "Whole rupees only"),
      })
    )
    .min(1, "Add at least one item")
    .max(MAX_PO_LINES, "Too many lines"),
});

export const purchaseActionSchema = z.object({ action: z.enum(["ORDER", "CANCEL"]) });

export const receiveSchema = z.object({
  receiptKey: safeId("receipt key"),
  lines: z
    .array(z.object({ variantId: safeId("variant"), quantity: qty, imeis: z.array(imeiEntry).max(MAX_IMEI_UNITS_PER_ACTION).default([]) }))
    .min(1, "Nothing to receive")
    .max(MAX_PO_LINES),
});

export const ADJUST_REASONS = ["DAMAGE", "LOSS", "FOUND", "COUNT_CORRECTION", "OTHER"];

export const adjustSchema = z.object({
  variantId: safeId("variant"),
  branchId: safeId("branch"),
  delta: z.coerce.number().int("Whole number").refine((n) => n !== 0, "Change cannot be zero").refine((n) => Math.abs(n) <= 100000, "Too large"),
  reason: z.enum(ADJUST_REASONS),
  note: optionalText(200, "Note"),
});

export const transferCreateSchema = z.object({
  fromBranchId: safeId("branch"),
  toBranchId: safeId("branch"),
  note: optionalText(200, "Note"),
  items: z
    .array(
      z.object({
        variantId: safeId("variant"),
        quantity: qty,
        imeis: z.array(z.string().trim().refine(isValidImei, "IMEI: 15 digits with a valid check digit").transform(normalizeImei)).max(MAX_IMEI_UNITS_PER_ACTION).default([]),
      })
    )
    .min(1, "Add at least one item")
    .max(MAX_PO_LINES),
});

export const transferActionSchema = z.object({ action: z.enum(["RECEIVE", "CANCEL"]) });
