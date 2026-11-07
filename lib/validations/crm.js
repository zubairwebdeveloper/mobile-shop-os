import { z } from "zod";
import { isSafeId } from "../security/ids.js";
import { isValidImei, normalizeImei } from "../catalog/pure.js";
import { addMonths, isValidDateStr, normalizePhone, REPAIR_STATUSES } from "../customers/pure.js";

const safeId = (label) => z.string().refine(isSafeId, `Invalid ${label}`);
const rupees = z.string().trim().regex(/^\d{1,9}$/, "Whole rupees only");
const rupeesDefault0 = z.string().trim().default("0").refine((v) => /^\d{1,9}$/.test(v), "Whole rupees only");
const imei = z.string().trim().refine(isValidImei, "IMEI: 15 digits with a valid check digit").transform(normalizeImei);
const phone = z.string().trim().refine((v) => normalizePhone(v) !== null, "Enter a valid phone number");
const optionalPhone = z.string().trim().default("").refine((v) => v === "" || normalizePhone(v) !== null, "Enter a valid phone number");
const text = (max) => z.string().trim().max(max, `At most ${max} characters`).default("");

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name").max(80, "Name is too long"),
  phone,
  email: z.string().trim().default("").refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email"),
  city: text(60),
  address: text(200),
  notes: text(500),
  vip: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
});
export const customerUpdateSchema = customerSchema.extend({ status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE") });

export const warrantyRegisterSchema = z.object({
  saleId: safeId("sale"),
  months: z.coerce.number().int("Whole months").min(1, "At least 1 month").max(60, "At most 60 months"),
  startDate: z.string().refine(isValidDateStr, "Use a real date (YYYY-MM-DD)"),
  terms: text(500),
  items: z.array(z.object({ variantId: safeId("variant"), imeis: z.array(imei).max(40).default([]) })).min(1, "Choose what to cover").max(40),
}).refine((v) => addMonths(v.startDate, v.months) > v.startDate, "Invalid warranty period");

export const warrantyActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("VOID"), reason: z.string().trim().min(3, "Say why").max(200) }),
  z.object({ action: z.literal("CLAIM_ADD"), description: z.string().trim().min(3, "Describe the problem").max(500) }),
  z.object({ action: z.literal("CLAIM_UPDATE"), claimId: safeId("claim"), status: z.enum(["APPROVED", "REJECTED", "RESOLVED"]), resolution: text(300) }),
]);

export const repairCreateSchema = z.object({
  branchId: safeId("branch"),
  customerId: z.string().refine(isSafeId, "Invalid customer").optional(),
  customerName: text(80),
  customerPhone: optionalPhone,
  deviceBrand: z.string().trim().min(1, "Enter the brand").max(40),
  deviceModel: z.string().trim().min(1, "Enter the model").max(60),
  imei: z.string().trim().default("").refine((v) => v === "" || isValidImei(v), "IMEI: 15 digits with a valid check digit").transform((v) => (v ? normalizeImei(v) : "")),
  issue: z.string().trim().min(3, "Describe the problem").max(500),
  accessories: text(200),
  estimatedCost: rupeesDefault0,
  warrantyId: z.string().refine(isSafeId, "Invalid warranty").optional(),
});

export const repairActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("UPDATE"), estimatedCost: rupeesDefault0, labourCharge: rupeesDefault0, diagnosis: text(500), technicianUid: z.string().default("").refine((v) => v === "" || isSafeId(v), "Invalid technician") }),
  z.object({ action: z.literal("STATUS"), status: z.enum(REPAIR_STATUSES), note: text(300), collected: rupeesDefault0, method: z.enum(["CASH", "BANK_TRANSFER", "JAZZCASH", "EASYPAISA"]).default("CASH") }),
  z.object({ action: z.literal("ADD_PART"), variantId: safeId("part"), quantity: z.coerce.number().int().min(1).max(100), unitPrice: rupees }),
  z.object({ action: z.literal("REMOVE_PART"), partId: safeId("part") }),
]);
export { rupees };
