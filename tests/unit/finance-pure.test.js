import { describe, expect, it } from "bun:test";
import {
  addDays, allocatePayment, applyCollection, buildSchedule, computeReport, csvCell, effectiveSchedule, purchasePayable, scheduleStatus, toCsv,
} from "../../src/lib/finance/pure.js";

const R = (n) => n * 100;

describe("schedule", () => {
  it("splits whole rupees, front-loading the remainder, and the rows add up", () => {
    const s = buildSchedule({ principal: R(1000), count: 3, firstDueDate: "2026-11-30", frequency: "MONTHLY" });
    expect(s.ok).toBe(true);
    expect(s.rows.map((r) => r.amount)).toEqual([R(334), R(333), R(333)]);
    expect(s.rows.reduce((a, r) => a + r.amount, 0)).toBe(R(1000));
    expect(s.rows.map((r) => r.dueDate)).toEqual(["2026-11-30", "2026-12-30", "2027-01-30"]);
  });
  it("monthly dates clamp but do not drift; weekly steps 7 days", () => {
    expect(buildSchedule({ principal: R(300), count: 3, firstDueDate: "2026-01-31", frequency: "MONTHLY" }).rows.map((r) => r.dueDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(buildSchedule({ principal: R(300), count: 3, firstDueDate: "2026-11-05", frequency: "WEEKLY" }).rows.map((r) => r.dueDate)).toEqual(["2026-11-05", "2026-11-12", "2026-11-19"]);
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("rejects bad counts and tiny balances", () => {
    expect(buildSchedule({ principal: R(1000), count: 1, firstDueDate: "2026-11-05", frequency: "MONTHLY" }).code).toBe("BAD_COUNT");
    expect(buildSchedule({ principal: R(1000), count: 37, firstDueDate: "2026-11-05", frequency: "MONTHLY" }).code).toBe("BAD_COUNT");
    expect(buildSchedule({ principal: R(2), count: 3, firstDueDate: "2026-11-05", frequency: "MONTHLY" }).code).toBe("BALANCE_TOO_SMALL");
    expect(buildSchedule({ principal: 150, count: 2, firstDueDate: "2026-11-05", frequency: "MONTHLY" }).code).toBe("BALANCE_TOO_SMALL");
  });
});

describe("collections against a schedule", () => {
  const rows = () => buildSchedule({ principal: R(900), count: 3, firstDueDate: "2026-11-01", frequency: "MONTHLY" }).rows;
  it("fills the earliest installment first and supports partial payments", () => {
    const eff = effectiveSchedule(rows(), R(900));
    expect(allocatePayment(eff, R(500)).allocations).toEqual([{ no: 1, amount: R(300) }, { no: 2, amount: R(200) }]);
    const paid = rows().map((r, i) => (i === 0 ? { ...r, paid: R(300) } : i === 1 ? { ...r, paid: R(200) } : r));
    const eff2 = effectiveSchedule(paid, R(400));
    expect(eff2.map((r) => r.outstanding)).toEqual([0, R(100), R(300)]);
    expect(allocatePayment(eff2, R(150)).allocations).toEqual([{ no: 2, amount: R(100) }, { no: 3, amount: R(50) }]);
  });
  it("a cancelled part of the debt (return) shrinks the LAST installments", () => {
    const eff = effectiveSchedule(rows(), R(500));
    expect(eff.map((r) => r.outstanding)).toEqual([R(300), R(200), 0]);
    expect(effectiveSchedule(rows(), 0).every((r) => r.outstanding === 0)).toBe(true);
  });
  it("overdue tracking by shop-local date", () => {
    const eff = effectiveSchedule(rows(), R(900));
    expect(scheduleStatus(eff, "2026-10-31")).toMatchObject({ state: "CURRENT", overdueCount: 0, nextDue: { no: 1 } });
    expect(scheduleStatus(eff, "2026-11-01").state).toBe("CURRENT"); // due today is not late yet
    expect(scheduleStatus(eff, "2026-12-05")).toMatchObject({ state: "OVERDUE", overdueCount: 2, overdueAmount: R(600), maxDaysLate: 34 });
    expect(scheduleStatus(effectiveSchedule(rows(), 0), "2027-01-01").state).toBe("COMPLETED");
  });
  it("applyCollection refuses zero, fractions and overpayment", () => {
    expect(applyCollection({ dueAmount: R(100) }, R(40))).toEqual({ ok: true, dueAmount: R(60) });
    expect(applyCollection({ dueAmount: R(100) }, R(101)).code).toBe("OVERPAYMENT");
    expect(applyCollection({ dueAmount: R(100) }, 0).code).toBe("BAD_AMOUNT");
    expect(applyCollection({ dueAmount: R(100) }, 1.5).code).toBe("BAD_AMOUNT");
    expect(applyCollection({}, R(1)).code).toBe("OVERPAYMENT");
  });
});

describe("supplier payables", () => {
  it("owe only what was received, minus payments", () => {
    const p = { items: [{ receivedQty: 3, unitCost: R(100) }, { receivedQty: 0, unitCost: R(900) }], paidAmount: R(100) };
    expect(purchasePayable(p)).toBe(R(200));
    expect(purchasePayable({ items: [{ receivedQty: 1, unitCost: R(50) }], paidAmount: R(80) })).toBe(0);
    expect(purchasePayable({ items: [] })).toBe(0);
  });
});

describe("report: revenue is not profit", () => {
  const sales = [
    { branchId: "A", total: R(1100), taxAmount: R(100), costTotal: R(600), payments: [{ method: "CASH", amount: R(1000) }, { method: "JAZZCASH", amount: R(100) }] },
    { branchId: "A", total: R(500), taxAmount: 0, costTotal: null, payments: [{ method: "CASH", amount: R(200) }, { method: "EXCHANGE_CREDIT", amount: R(300) }] },
    { branchId: "B", total: R(2000), taxAmount: 0, costTotal: R(1500), payments: [{ method: "BANK_TRANSFER", amount: R(2000) }] },
  ];
  const returns = [{ branchId: "A", refundAmount: R(110), taxRefund: R(10), costReversed: R(60), payout: R(110), refundMethod: "CASH" }];
  const repairs = [{ branchId: "B", finalCost: R(700), partsCost: R(200), collected: R(700), collectionMethod: "CASH" }];
  const expenses = [{ branchId: "A", amount: R(300), category: "RENT", method: "CASH" }, { branchId: "B", amount: R(100), category: "UTILITIES", method: "BANK_TRANSFER" }];
  const collections = [{ branchId: "A", amount: R(50), method: "CASH" }];
  const supplierPayments = [{ branchId: "A", amount: R(400), method: "BANK_TRANSFER" }];
  const rep = computeReport({ sales, returns, repairs, expenses, collections, supplierPayments });

  it("keeps revenue, gross profit and net profit apart", () => {
    expect(rep.revenue).toMatchObject({ salesGross: R(3600), taxCollected: R(90), salesNet: R(3500), refundsNet: R(100), netSales: R(3400), repairRevenue: R(700), total: R(4100) });
    expect(rep.costs).toMatchObject({ cogs: R(600 + 1500 - 60), repairPartsCost: R(200), unknownCostSales: 1 });
    expect(rep.grossProfit).toBe(R(4100) - R(2040) - R(200));
    expect(rep.expenses).toEqual({ total: R(400), byCategory: { RENT: R(300), UTILITIES: R(100) } });
    expect(rep.netProfit).toBe(rep.grossProfit - R(400));
    expect(rep.netProfit).toBeLessThan(rep.revenue.total);
  });
  it("cash movement by method ignores exchange credit and counts every real payment", () => {
    expect(rep.cash.in).toEqual({ CASH: R(1000 + 200 + 50 + 700), JAZZCASH: R(100), BANK_TRANSFER: R(2000) });
    expect(rep.cash.out).toEqual({ CASH: R(110 + 300), BANK_TRANSFER: R(100 + 400) });
    expect(rep.cash.netByMethod).toEqual({ BANK_TRANSFER: R(1500), CASH: R(1950 - 410), JAZZCASH: R(100) });
    expect(rep.cash.netTotal).toBe(R(1500 + 1540 + 100));
  });
  it("branch rows add up to the whole", () => {
    expect(rep.byBranch.map((b) => b.branchId)).toEqual(["A", "B"]);
    expect(rep.byBranch.reduce((a, b) => a + b.revenue, 0)).toBe(rep.revenue.total);
    expect(rep.byBranch.reduce((a, b) => a + b.grossProfit, 0)).toBe(rep.grossProfit);
    expect(rep.byBranch.reduce((a, b) => a + b.netProfit, 0)).toBe(rep.netProfit);
  });
  it("an empty period is all zeros", () => {
    const e = computeReport({});
    expect(e.revenue.total).toBe(0);
    expect(e.netProfit).toBe(0);
    expect(e.byBranch).toEqual([]);
  });
});

describe("csv", () => {
  it("quotes properly and neutralises spreadsheet formulas", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+92 300")).toBe("'+92 300");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell(null)).toBe("");
    expect(csvCell(120)).toBe("120");
    expect(toCsv(["a", "b"], [["1", "x,y"]])).toBe('a,b\r\n1,"x,y"');
  });
});
