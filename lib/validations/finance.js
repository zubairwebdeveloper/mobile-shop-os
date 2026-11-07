import { z } from "zod";
import { isSafeId } from "../security/ids.js";
import { isValidDateStr } from "../customers/pure.js";
import { COLLECTION_METHODS, EXPENSE_CATEGORIES, MAX_INSTALLMENTS, MIN_INSTALLMENTS } from "../finance/pure.js";

const safeId = (label) => z.string().refine(isSafeId, `Invalid ${label}`);
const rupees = z.string().trim().regex(/^\d{1,9}$/, "Whole rupees only");
const positiveRupees = rupees.refine((v) => Number(v) > 0, "Enter an amount more than zero");
const date = z.string().refine(isValidDateStr, "Use a real date (YYYY-MM-DD)");
const text = (max) => z.string().trim().max(max, `At most ${max} characters`).default("");

export const installmentPlanSchema = z.object({
  saleId: safeId("sale"),
  count: z.coerce.number().int("Whole number").min(MIN_INSTALLMENTS, `At least ${MIN_INSTALLMENTS}`).max(MAX_INSTALLMENTS, `At most ${MAX_INSTALLMENTS}`),
  firstDueDate: date,
  frequency: z.enum(["MONTHLY", "WEEKLY"]),
});

export const collectSchema = z.object({
  paymentKey: safeId("payment key"),
  targetType: z.enum(["SALE", "REPAIR"]),
  targetId: safeId("target"),
  amount: positiveRupees,
  method: z.enum(COLLECTION_METHODS),
  reference: text(60),
});

export const expenseSchema = z.object({
  branchId: safeId("branch"),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: positiveRupees,
  date,
  method: z.enum(COLLECTION_METHODS),
  paidTo: text(80),
  note: text(300),
});

export const expenseVoidSchema = z.object({ reason: z.string().trim().min(3, "Say why").max(200) });

export const supplierPaymentSchema = z.object({
  paymentKey: safeId("payment key"),
  purchaseId: safeId("purchase"),
  amount: positiveRupees,
  method: z.enum(COLLECTION_METHODS),
  reference: text(60),
});

export const periodSchema = z.object({ from: date, to: date, branchId: safeId("branch").optional() }).refine((v) => v.from <= v.to, "The start date must not be after the end date").refine(
  (v) => (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= 366, "Choose at most one year at a time");

export const reconcileSchema = z.object({
  method: z.enum(COLLECTION_METHODS),
  from: date, to: date,
  branchId: z.preprocess((v) => (v === "" ? undefined : v), safeId("branch").optional()),
  statementTotal: z.string().trim().regex(/^-?\d{1,9}$/, "Whole rupees (negative allowed)"),
  note: text(300),
}).refine((v) => v.from <= v.to, "The start date must not be after the end date");
