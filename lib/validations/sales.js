import { z } from "zod";
import { isSafeId } from "../security/ids.js";
import { isValidImei, normalizeImei } from "../catalog/pure.js";
import { MAX_SALE_IMEI_UNITS, MAX_SALE_LINES, PAYMENT_METHODS, REFUND_METHODS, taxPercentToBps } from "../sales/pure.js";

const safeId = (label) => z.string().refine(isSafeId, `Invalid ${label}`);
const rupees = z.string().trim().regex(/^\d{1,9}$/, "Whole rupees only");
const rupeesDefault0 = z.string().trim().default("0").refine((v) => /^\d{1,9}$/.test(v), "Whole rupees only");
const PHONE = /^\+?[0-9][0-9\s-]{5,18}[0-9]$/;
const qty = z.coerce.number().int("Whole number").min(1, "At least 1").max(10000, "Too large");
const imei = z.string().trim().refine(isValidImei, "IMEI: 15 digits with a valid check digit").transform(normalizeImei);

export const saleCreateSchema = z.object({
  saleKey: safeId("sale key"),
  branchId: safeId("branch"),
  customerId: z.string().refine(isSafeId, "Invalid customer").optional(),
  customerName: z.string().trim().max(80, "Name is too long").default(""),
  customerPhone: z.string().trim().default("").refine((v) => v === "" || PHONE.test(v), "Enter a valid phone number"),
  note: z.string().trim().max(300).default(""),
  taxPercent: z.string().trim().default("0").refine((v) => taxPercentToBps(v) !== null, "Tax: 0 to 30, up to 2 decimals"),
  orderDiscount: rupeesDefault0,
  items: z
    .array(z.object({ variantId: safeId("variant"), quantity: qty, discount: rupeesDefault0, imeis: z.array(imei).max(MAX_SALE_IMEI_UNITS).default([]) }))
    .min(1, "Add at least one item")
    .max(MAX_SALE_LINES, "Too many lines"),
  payments: z
    .array(z.object({ method: z.enum(PAYMENT_METHODS), amount: rupees, reference: z.string().trim().max(60).default(""), exchangeId: z.string().refine(isSafeId, "Invalid exchange").optional() }))
    .max(5, "At most 5 payment lines")
    .default([]),
});

export const RETURN_REASONS = ["DEFECTIVE", "WRONG_ITEM", "CUSTOMER_CHANGED_MIND", "OTHER"];

export const returnCreateSchema = z.object({
  returnKey: safeId("return key"),
  saleId: safeId("sale"),
  reason: z.enum(RETURN_REASONS),
  note: z.string().trim().max(300).default(""),
  refundMethod: z.enum(REFUND_METHODS),
  reference: z.string().trim().max(60).default(""),
  items: z
    .array(z.object({ variantId: safeId("variant"), quantity: qty, restock: z.boolean().default(true), imeis: z.array(imei).max(MAX_SALE_IMEI_UNITS).default([]) }))
    .min(1, "Choose what is being returned")
    .max(MAX_SALE_LINES),
});

export const closingSchema = z.object({
  branchId: safeId("branch"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  openingCash: rupeesDefault0,
  countedCash: rupees,
  note: z.string().trim().max(300).default(""),
});
