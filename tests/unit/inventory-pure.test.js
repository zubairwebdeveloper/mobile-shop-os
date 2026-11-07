import { describe, expect, it } from "vitest";
import {
  applyDelta, imeiStockEffect, inventoryId, lowStockRows, parseImeiLines, poNumber, remaining,
  statusAfterReceipt, totalCost, validateReceiveLines, validateTransfer,
} from "@/lib/inventory/pure";

const A = "490154203237518";
const B = "356938035643809";

describe("basics", () => {
  it("builds ids and numbers", () => {
    expect(inventoryId("v1", "b1")).toBe("v1_b1");
    expect(poNumber(7)).toBe("PO-000007");
  });
  it("applyDelta never goes below zero", () => {
    expect(applyDelta(5, -5)).toBe(0);
    expect(applyDelta(5, -6)).toBeNull();
    expect(applyDelta(undefined, 3)).toBe(3);
    expect(applyDelta(2, 0.5)).toBeNull();
  });
  it("totals cost in paisa and works out remaining", () => {
    expect(totalCost([{ quantity: 2, unitCost: 500 }, { quantity: 3, unitCost: 100 }])).toBe(1300);
    expect(remaining({ quantity: 5, receivedQty: 2 })).toBe(3);
    expect(remaining({ quantity: 5 })).toBe(5);
  });
});

describe("statusAfterReceipt", () => {
  it("is RECEIVED only when every line is complete", () => {
    expect(statusAfterReceipt([{ quantity: 2, receivedQty: 2 }, { quantity: 1, receivedQty: 1 }])).toBe("RECEIVED");
    expect(statusAfterReceipt([{ quantity: 2, receivedQty: 2 }, { quantity: 1, receivedQty: 0 }])).toBe("PARTIALLY_RECEIVED");
  });
});

describe("parseImeiLines", () => {
  it("handles one or two IMEIs per line, blanks and separators", () => {
    expect(parseImeiLines(`${A}\n\n ${B} , ${A} \n`)).toEqual([{ imei1: A, imei2: "" }, { imei1: B, imei2: A }]);
    expect(parseImeiLines("")).toEqual([]);
    expect(parseImeiLines(null)).toEqual([]);
  });
});

describe("validateReceiveLines", () => {
  const items = [
    { variantId: "v1", productName: "Phone", quantity: 3, receivedQty: 1 },
    { variantId: "v2", productName: "Case", quantity: 10, receivedQty: 0 },
  ];
  const tracked = { v1: true, v2: false };
  const ok = [{ variantId: "v1", quantity: 2, imeis: [{ imei1: A, imei2: "" }, { imei1: B, imei2: "" }] }, { variantId: "v2", quantity: 10, imeis: [] }];

  it("accepts a correct receipt", () => expect(validateReceiveLines(items, ok, tracked)).toEqual({ ok: true }));
  it("refuses over-receipt", () => {
    expect(validateReceiveLines(items, [{ variantId: "v2", quantity: 11, imeis: [] }], tracked)).toMatchObject({ code: "OVER_RECEIPT" });
    expect(validateReceiveLines(items, [{ variantId: "v1", quantity: 3, imeis: [{ imei1: A }, { imei1: B }, { imei1: "1" }] }], tracked)).toMatchObject({ code: "OVER_RECEIPT" });
  });
  it("needs one IMEI entry per tracked unit and none for untracked", () => {
    expect(validateReceiveLines(items, [{ variantId: "v1", quantity: 2, imeis: [{ imei1: A }] }], tracked)).toMatchObject({ code: "IMEI_COUNT" });
    expect(validateReceiveLines(items, [{ variantId: "v2", quantity: 1, imeis: [{ imei1: A }] }], tracked)).toMatchObject({ code: "IMEI_NOT_TRACKED" });
  });
  it("refuses repeated IMEIs, repeated lines, unknown lines and empty input", () => {
    expect(validateReceiveLines(items, [{ variantId: "v1", quantity: 2, imeis: [{ imei1: A }, { imei1: B, imei2: A }] }], tracked)).toMatchObject({ code: "DUPLICATE_IMEI" });
    expect(validateReceiveLines(items, [{ variantId: "v2", quantity: 1 }, { variantId: "v2", quantity: 1 }], tracked)).toMatchObject({ code: "DUPLICATE_LINE" });
    expect(validateReceiveLines(items, [{ variantId: "zz", quantity: 1 }], tracked)).toMatchObject({ code: "NOT_ON_PURCHASE" });
    expect(validateReceiveLines(items, [], tracked)).toMatchObject({ code: "NO_LINES" });
    expect(validateReceiveLines(items, [{ variantId: "v2", quantity: 0 }], tracked)).toMatchObject({ code: "BAD_QUANTITY" });
  });
});

describe("lowStockRows", () => {
  const variants = [
    { id: "a", productName: "A", status: "ACTIVE", minStock: 5 },
    { id: "b", productName: "B", status: "ACTIVE", minStock: 0 },
    { id: "c", productName: "C", status: "ARCHIVED", minStock: 5 },
    { id: "d", productName: "D", status: "ACTIVE", minStock: 2 },
  ];
  it("flags active variants at or below minimum and sorts by quantity", () => {
    const rows = lowStockRows(variants, { a: 5, d: 1 });
    expect(rows.map((r) => r.id)).toEqual(["d", "a"]);
    expect(lowStockRows(variants, { a: 6, d: 3 })).toEqual([]);
    expect(lowStockRows(variants, {}).map((r) => r.id)).toEqual(["a", "d"]); // missing = 0
  });
});

describe("validateTransfer", () => {
  it("checks branches and lines", () => {
    expect(validateTransfer({ fromBranchId: "a", toBranchId: "a", items: [{ variantId: "v", quantity: 1 }] })).toMatchObject({ code: "SAME_BRANCH" });
    expect(validateTransfer({ fromBranchId: "a", toBranchId: "b", items: [] })).toMatchObject({ code: "NO_ITEMS" });
    expect(validateTransfer({ fromBranchId: "a", toBranchId: "b", items: [{ variantId: "v", quantity: 0 }] })).toMatchObject({ code: "BAD_QUANTITY" });
    expect(validateTransfer({ fromBranchId: "a", toBranchId: "b", items: [{ variantId: "v", quantity: 1 }, { variantId: "v", quantity: 1 }] })).toMatchObject({ code: "DUPLICATE_LINE" });
    expect(validateTransfer({ fromBranchId: "a", toBranchId: "b", items: [{ variantId: "v", quantity: 2 }] })).toEqual({ ok: true });
  });
});

describe("imeiStockEffect", () => {
  it("only IN_STOCK devices count", () => {
    expect(imeiStockEffect({ status: "IN_STOCK", branchId: "a" }, { status: "DAMAGED", branchId: "a" })).toEqual([{ branchId: "a", delta: -1 }]);
    expect(imeiStockEffect({ status: "DAMAGED", branchId: "a" }, { status: "IN_STOCK", branchId: "a" })).toEqual([{ branchId: "a", delta: 1 }]);
    expect(imeiStockEffect({ status: "IN_STOCK", branchId: "a" }, { status: "IN_STOCK", branchId: "b" })).toEqual([{ branchId: "a", delta: -1 }, { branchId: "b", delta: 1 }]);
    expect(imeiStockEffect({ status: "IN_STOCK", branchId: "a" }, { status: "IN_STOCK", branchId: "a" })).toEqual([]);
    expect(imeiStockEffect({ status: "DAMAGED", branchId: "a" }, { status: "RESERVED", branchId: "b" })).toEqual([]);
  });
});
