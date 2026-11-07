import { describe, expect, it } from "bun:test";
import {
  addMonths, canTransition, customerStats, daysBetween, isValidDateStr, normalizePhone, repairTotals, settleDelivery, warrantyState,
} from "../../src/lib/customers/pure.js";

describe("phone normalisation", () => {
  it("makes local and international forms equal", () => {
    const n = normalizePhone("0300 1234567");
    expect(n).toBe("923001234567");
    expect(normalizePhone("+92 300 1234567")).toBe(n);
    expect(normalizePhone("0092-300-1234567")).toBe(n);
    expect(normalizePhone("3001234567")).toBe(n);
  });
  it("rejects junk", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("1".repeat(16))).toBeNull();
  });
});

describe("dates and warranty", () => {
  it("validates real dates only", () => {
    expect(isValidDateStr("2026-02-28")).toBe(true);
    expect(isValidDateStr("2026-02-30")).toBe(false);
    expect(isValidDateStr("26-02-28")).toBe(false);
  });
  it("adds months with end-of-month clamping and year rollover", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15", 12)).toBe("2027-11-15");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-03-31", 6)).toBe("2026-09-30");
  });
  it("counts days", () => {
    expect(daysBetween("2026-11-01", "2026-11-05")).toBe(4);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
  it("warranty is covered through its expiry day, then expired; void wins", () => {
    expect(warrantyState({ status: "ACTIVE", expiryDate: "2026-11-05" }, "2026-11-05")).toEqual({ state: "ACTIVE", daysLeft: 0 });
    expect(warrantyState({ status: "ACTIVE", expiryDate: "2026-11-05" }, "2026-11-06").state).toBe("EXPIRED");
    expect(warrantyState({ status: "ACTIVE", expiryDate: "2027-01-01" }, "2026-11-05").daysLeft).toBe(57);
    expect(warrantyState({ status: "VOIDED", expiryDate: "2099-01-01" }, "2026-11-05").state).toBe("VOIDED");
  });
});

describe("repairs", () => {
  it("allows only the defined status steps", () => {
    expect(canTransition("RECEIVED", "DIAGNOSING")).toBe(true);
    expect(canTransition("RECEIVED", "DELIVERED")).toBe(false);
    expect(canTransition("READY", "DELIVERED")).toBe(true);
    expect(canTransition("DELIVERED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("CANCELLED", "RECEIVED")).toBe(false);
    expect(canTransition("NOPE", "RECEIVED")).toBe(false);
  });
  it("totals labour and parts", () => {
    expect(repairTotals({ labourCharge: 50000, parts: [{ unitPrice: 20000, quantity: 2 }] })).toEqual({ partsTotal: 40000, total: 90000 });
    expect(repairTotals({})).toEqual({ partsTotal: 0, total: 0 });
  });
  it("delivery settlement", () => {
    expect(settleDelivery({ total: 90000, collected: 90000, underWarranty: false, hasCustomer: false })).toMatchObject({ ok: true, dueAmount: 0 });
    expect(settleDelivery({ total: 90000, collected: 50000, underWarranty: false, hasCustomer: true })).toMatchObject({ ok: true, dueAmount: 40000 });
    expect(settleDelivery({ total: 90000, collected: 50000, underWarranty: false, hasCustomer: false }).code).toBe("CUSTOMER_REQUIRED");
    expect(settleDelivery({ total: 90000, collected: 99000, underWarranty: false, hasCustomer: true }).code).toBe("OVERPAYMENT");
    expect(settleDelivery({ total: 90000, collected: 5000, underWarranty: true, hasCustomer: false })).toMatchObject({ ok: true, finalCost: 0, collected: 0, dueAmount: 0 });
  });
});

describe("customer stats", () => {
  it("lifetime value is net of refunds; outstanding includes sales and repairs", () => {
    const s = customerStats({
      sales: [
        { total: 100000, refundedTotal: 20000, dueAmount: 0, createdAt: "2026-11-01T10:00:00.000Z" },
        { total: 50000, dueAmount: 30000, createdAt: "2026-11-03T10:00:00.000Z" },
      ],
      repairs: [{ dueAmount: 10000 }],
    });
    expect(s).toEqual({ salesCount: 2, lifetimeValue: 130000, outstanding: 40000, lastPurchaseAt: "2026-11-03T10:00:00.000Z" });
    expect(customerStats({})).toEqual({ salesCount: 0, lifetimeValue: 0, outstanding: 0, lastPurchaseAt: null });
  });
});
