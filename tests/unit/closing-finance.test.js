import { describe, expect, it } from "bun:test";
import { closingTotals } from "../../src/lib/sales/pure.js";

const R = (n) => n * 100;

describe("daily closing with finance", () => {
  const sales = [{ total: R(1000), dueAmount: R(400), payments: [{ method: "CASH", amount: R(600) }] }];
  it("is unchanged when there is nothing new (Phase 8 behaviour)", () => {
    expect(closingTotals({ sales, returns: [], openingCash: R(100) }).expectedCash).toBe(R(700));
  });
  it("adds collected balances and repair cash, subtracts cash expenses and cash supplier payments", () => {
    const t = closingTotals({
      sales, returns: [{ refundAmount: R(50), payout: R(50), refundMethod: "CASH" }], openingCash: R(100),
      collections: [{ method: "CASH", amount: R(200) }, { method: "JAZZCASH", amount: R(999) }],
      repairs: [{ collected: R(300), collectionMethod: "CASH" }, { collected: R(500), collectionMethod: "BANK_TRANSFER" }],
      expenses: [{ amount: R(80), method: "CASH" }, { amount: R(700), method: "BANK_TRANSFER" }],
      supplierPayments: [{ amount: R(120), method: "CASH" }, { amount: R(5000), method: "BANK_TRANSFER" }],
    });
    expect(t.expectedCash).toBe(R(100 + 600 + 200 + 300 - 50 - 80 - 120));
    expect(t.collectionsByMethod).toEqual({ CASH: R(200), JAZZCASH: R(999) });
    expect(t).toMatchObject({ repairCash: R(300), expensesCash: R(80), supplierCash: R(120) });
  });
});
