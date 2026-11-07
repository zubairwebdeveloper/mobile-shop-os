import { z } from "zod";
import { isSafeId } from "../security/ids.js";
import { isValidImei, normalizeBarcode, normalizeImei } from "../catalog/pure.js";

const text = (min, max, label) => z.string().trim().min(min, `${label} is required`).max(max, `${label} is too long`);
const optionalText = (max, label) => z.string().trim().max(max, `${label} is too long`).default("");
const safeId = (label) => z.string().refine(isSafeId, `Invalid ${label}`);

const price = (label) =>
  z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^\d{1,9}$/.test(v), `${label}: whole rupees only`);

const optionalCode = (label) =>
  z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || normalizeBarcode(v) !== "", `${label}: 3-64 letters or numbers, may include . _ -`);

export const categorySchema = z.object({
  name: text(2, 40, "Name"),
  tracksImei: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const brandSchema = z.object({
  name: text(2, 40, "Name"),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  name: text(2, 120, "Product name"),
  brandId: safeId("brand"),
  categoryId: safeId("category"),
  description: optionalText(500, "Description"),
  specs: optionalText(1000, "Specifications"),
  barcode: optionalCode("Barcode"),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const variantSchema = z.object({
  storage: optionalText(20, "Storage"),
  ram: optionalText(20, "RAM"),
  color: optionalText(30, "Colour"),
  sku: optionalCode("SKU"),
  barcode: optionalCode("Barcode"),
  purchasePrice: price("Purchase price"),
  sellingPrice: price("Selling price"),
  wholesalePrice: price("Wholesale price"),
  minStock: z.coerce.number().int("Whole number").min(0).max(100000).default(0),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

const imeiField = (label) =>
  z
    .string()
    .trim()
    .refine((v) => isValidImei(v), `${label}: enter 15 digits with a valid check digit`)
    .transform(normalizeImei);

export const imeiCreateSchema = z
  .object({
    variantId: safeId("variant"),
    branchId: safeId("branch"),
    imei1: imeiField("IMEI 1"),
    imei2: z
      .string()
      .trim()
      .default("")
      .refine((v) => v === "" || isValidImei(v), "IMEI 2: enter 15 digits with a valid check digit")
      .transform((v) => (v === "" ? "" : normalizeImei(v))),
    serialNumber: optionalText(40, "Serial number"),
    condition: z.enum(["NEW", "USED", "REFURBISHED"]).default("NEW"),
    purchasePrice: price("Purchase price"),
    notes: optionalText(300, "Notes"),
  })
  .superRefine((v, ctx) => {
    if (v.imei2 !== "" && v.imei2 === v.imei1) {
      ctx.addIssue({ code: "custom", path: ["imei2"], message: "IMEI 2 must differ from IMEI 1" });
    }
  });

export const IMEI_STATUSES = ["IN_STOCK", "DAMAGED", "RESERVED", "IN_REPAIR"];

export const imeiUpdateSchema = z.object({
  status: z.enum(IMEI_STATUSES),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]),
  branchId: safeId("branch"),
  serialNumber: optionalText(40, "Serial number"),
  notes: optionalText(300, "Notes"),
});

export const lookupSchema = z.object({ code: z.string().trim().min(3, "Enter a code").max(64) });
