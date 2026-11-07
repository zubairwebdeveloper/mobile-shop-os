import { describe, expect, it } from "bun:test";
import {
  attendanceSummary, branchPerformance, commissionFor, datesBetween, isValidMonth, leaveDays, monthRange, ratePercentToBps, rangesOverlap,
  saleNetExTax, salesByEmployee, targetProgress, validateLeaveRange,
} from "../../src/lib/hr/pure.js";

const R = (n) => n * 100;

describe("months and dates", () => {
  it("month range handles leap years", () => {
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-11")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
  });
  it("leave ranges", () => {
    expect(datesBetween("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(leaveDays("2026-11-01", "2026-11-03")).toBe(3);
    expect(validateLeaveRange("2026-11-05", "2026-11-04").ok).toBe(false);
    expect(validateLeaveRange("2026-02-30", "2026-03-01").ok).toBe(false);
    expect(validateLeaveRange("2026-01-01", "2026-06-01").ok).toBe(false);
    expect(validateLeaveRange("2026-11-05", "2026-11-05").ok).toBe(true);
    expect(rangesOverlap({ from: "2026-11-01", to: "2026-11-05" }, { from: "2026-11-05", to: "2026-11-09" })).toBe(true);
    expect(rangesOverlap({ from: "2026-11-01", to: "2026-11-04" }, { from: "2026-11-05", to: "2026-11-09" })).toBe(false);
  });
});

describe("commission rate and amount", () => {
  it("parses percent to basis points", () => {
    expect(ratePercentToBps("5")).toBe(500);
    expect(ratePercentToBps("2.5")).toBe(250);
    expect(ratePercentToBps("0.25")).toBe(25);
    expect(ratePercentToBps("20")).toBe(2000);
    for (const bad of ["20.01", "21", "-1", "1.234", "abc", "", "1,5"]) expect(ratePercentToBps(bad)).toBeNull();
  });
  it("rounds down to whole rupees and pays nothing on zero or negative sales", () => {
    expect(commissionFor(R(100000), 250)).toBe(R(2500));
    expect(commissionFor(R(999), 250)).toBe(R(24)); // 24.975 -> 24
    expect(commissionFor(0, 250)).toBe(0);
    expect(commissionFor(-R(500), 250)).toBe(0);
    expect(commissionFor(R(1000), 0)).toBe(0);
  });
  it("target progress", () => {
    expect(targetProgress(R(50), R(200))).toBe(25);
    expect(targetProgress(R(300), R(200))).toBe(150);
    expect(targetProgress(R(50), 0)).toBeNull();
    expect(targetProgress(-R(5), R(200))).toBe(0);
  });
});

describe("sale value for performance", () => {
  const sale = { items: [{ lineTotal: R(1100), taxShare: R(100), refundedAmount: 0 }, { lineTotal: R(500), taxShare: 0, refundedAmount: R(500) }] };
  it("is without tax and net of refunds", () => {
    expect(saleNetExTax(sale)).toBe(R(1000));
    expect(saleNetExTax({ items: [{ lineTotal: R(1100), taxShare: R(100), refundedAmount: R(1100) }] })).toBe(0);
    expect(saleNetExTax({ items: [{ lineTotal: R(1100), taxShare: R(100), refundedAmount: R(550) }] })).toBe(R(500));
    expect(saleNetExTax({})).toBe(0);
  });
  it("groups by employee and keeps unlinked sellers apart", () => {
    const sales = [{ createdBy: "u1", ...sale }, { createdBy: "u1", items: [{ lineTotal: R(200), taxShare: 0 }] }, { createdBy: "ghost", items: [{ lineTotal: R(300), taxShare: 0 }] }];
    const m = salesByEmployee(sales, new Map([["u1", "e1"]]));
    expect(m.get("e1")).toEqual({ employeeId: "e1", salesCount: 2, netSales: R(1200) });
    expect(m.get("unlinked")).toEqual({ employeeId: "unlinked", salesCount: 1, netSales: R(300) });
  });
});

describe("attendance summary", () => {
  const rec = (date, status) => ({ date, status });
  it("counts marks, approved leave and unmarked past days; ignores future and pre-join days", () => {
    const s = attendanceSummary({
      month: "2026-11", today: "2026-11-10", joinDate: "2026-11-03",
      records: [rec("2026-11-03", "PRESENT"), rec("2026-11-04", "LATE"), rec("2026-11-05", "HALF_DAY"), rec("2026-11-06", "ABSENT"), rec("2026-11-20", "PRESENT")],
      leaves: [{ from: "2026-11-07", to: "2026-11-08", status: "APPROVED" }, { from: "2026-11-09", to: "2026-11-09", status: "PENDING" }],
    });
    expect(s).toMatchObject({ PRESENT: 1, LATE: 1, HALF_DAY: 1, ABSENT: 1, LEAVE: 2, unmarked: 2 }); // 9th and 10th unmarked
    expect(s.rate).toBe(62.5); // (1 + 1 + 0.5) / 4
  });
  it("an explicit mark beats a leave; no marks gives a null rate", () => {
    const s = attendanceSummary({ month: "2026-11", today: "2026-11-02", records: [rec("2026-11-01", "PRESENT")], leaves: [{ from: "2026-11-01", to: "2026-11-02", status: "APPROVED" }] });
    expect(s).toMatchObject({ PRESENT: 1, LEAVE: 1, unmarked: 0, rate: 100 });
    expect(attendanceSummary({ month: "2026-11", today: "2026-11-05", records: [] }).rate).toBeNull();
  });
});

describe("branch performance", () => {
  it("summarises a branch", () => {
    const p = branchPerformance({
      sales: [{ total: R(1100), taxAmount: R(100), items: [{ lineTotal: R(1100), taxShare: R(100) }] }, { total: R(500), taxAmount: 0, items: [{ lineTotal: R(500), taxShare: 0, refundedAmount: R(500) }] }],
      returns: [{ refundAmount: R(500) }],
      repairs: [{ finalCost: R(700) }, { finalCost: 0 }],
      attendance: [{ status: "PRESENT" }, { status: "HALF_DAY" }, { status: "ABSENT" }, { status: "LEAVE" }],
    });
    expect(p).toMatchObject({ salesCount: 2, netSales: R(1000), averageSale: R(750), returnsCount: 1, refundTotal: R(500), repairsDelivered: 2, repairRevenue: R(700), attendanceRate: 50 });
    expect(branchPerformance({}).attendanceRate).toBeNull();
    expect(branchPerformance({}).averageSale).toBe(0);
  });
});
