import { describe, expect, it } from "bun:test";
import { collectSchema, expenseSchema, installmentPlanSchema, periodSchema, reconcileSchema, supplierPaymentSchema } from "../../src/lib/validations/finance.js";

const key = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

describe("installments and collections", () => {
  it("accepts a plan and rejects bad counts and dates", () => {
    expect(installmentPlanSchema.parse({ saleId: "s1", count: "6", firstDueDate: "2026-12-01", frequency: "MONTHLY" }).count).toBe(6);
    expect(installmentPlanSchema.safeParse({ saleId: "s1", count: 1, firstDueDate: "2026-12-01", frequency: "MONTHLY" }).success).toBe(false);
    expect(installmentPlanSchema.safeParse({ saleId: "s1", count: 6, firstDueDate: "2026-02-30", frequency: "MONTHLY" }).success).toBe(false);
    expect(installmentPlanSchema.safeParse({ saleId: "s1", count: 6, firstDueDate: "2026-12-01", frequency: "DAILY" }).success).toBe(false);
  });
  it("collections need a positive whole-rupee amount and a known method", () => {
    const base = { paymentKey: key, targetType: "SALE", targetId: "s1", amount: "500", method: "CASH" };
    expect(collectSchema.safeParse(base).success).toBe(true);
    expect(collectSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
    expect(collectSchema.safeParse({ ...base, amount: "-5" }).success).toBe(false);
    expect(collectSchema.safeParse({ ...base, amount: "5.5" }).success).toBe(false);
    expect(collectSchema.safeParse({ ...base, method: "EXCHANGE_CREDIT" }).success).toBe(false);
    expect(collectSchema.safeParse({ ...base, targetType: "LOAN" }).success).toBe(false);
  });
});

describe("expenses, supplier payments, reports", () => {
  it("expense", () => {
    const base = { branchId: "b1", category: "RENT", amount: "25000", date: "2026-11-05", method: "CASH" };
    expect(expenseSchema.parse(base).paidTo).toBe("");
    expect(expenseSchema.safeParse({ ...base, category: "YACHT" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...base, date: "5-11-2026" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...base, amount: "0" }).success).toBe(false);
  });
  it("supplier payment", () => {
    expect(supplierPaymentSchema.safeParse({ paymentKey: key, purchaseId: "p1", amount: "100", method: "BANK_TRANSFER" }).success).toBe(true);
    expect(supplierPaymentSchema.safeParse({ paymentKey: "bad key", purchaseId: "p1", amount: "100", method: "CASH" }).success).toBe(false);
  });
  it("period: ordered and at most a year", () => {
    expect(periodSchema.safeParse({ from: "2026-11-01", to: "2026-11-05" }).success).toBe(true);
    expect(periodSchema.safeParse({ from: "2026-11-05", to: "2026-11-01" }).success).toBe(false);
    expect(periodSchema.safeParse({ from: "2024-01-01", to: "2026-11-01" }).success).toBe(false);
  });
  it("reconciliation allows a negative statement total", () => {
    expect(reconcileSchema.safeParse({ method: "JAZZCASH", from: "2026-11-01", to: "2026-11-05", statementTotal: "-200" }).success).toBe(true);
    expect(reconcileSchema.safeParse({ method: "JAZZCASH", from: "2026-11-01", to: "2026-11-05", statementTotal: "1.5" }).success).toBe(false);
  });
});

describe("reconciliation branch", () => {
  it("an empty branch means all branches", () => {
    const r = reconcileSchema.parse({ method: "CASH", from: "2026-11-01", to: "2026-11-05", branchId: "", statementTotal: "10" });
    expect(r.branchId).toBeUndefined();
  });
});
