import { describe, expect, it } from "vitest";
import { adjustSchema, purchaseActionSchema, purchaseCreateSchema, receiveSchema, supplierSchema, transferActionSchema, transferCreateSchema } from "@/lib/validations/inventory";

const A = "490154203237518";

describe("supplierSchema", () => {
  it("accepts a name only and rejects bad phone", () => {
    expect(supplierSchema.safeParse({ name: "Hafeez Traders" }).success).toBe(true);
    expect(supplierSchema.safeParse({ name: "Hafeez Traders", phone: "abc" }).success).toBe(false);
    expect(supplierSchema.safeParse({ name: "H" }).success).toBe(false);
  });
});

describe("purchaseCreateSchema", () => {
  const ok = { supplierId: "s1", branchId: "b1", items: [{ variantId: "v1", quantity: "2", unitCost: "90000" }] };
  it("accepts and coerces", () => expect(purchaseCreateSchema.parse(ok).items[0].quantity).toBe(2));
  it("rejects empty items, decimals, zero quantity and unsafe ids", () => {
    expect(purchaseCreateSchema.safeParse({ ...ok, items: [] }).success).toBe(false);
    expect(purchaseCreateSchema.safeParse({ ...ok, items: [{ variantId: "v1", quantity: "1", unitCost: "1.5" }] }).success).toBe(false);
    expect(purchaseCreateSchema.safeParse({ ...ok, items: [{ variantId: "v1", quantity: "0", unitCost: "1" }] }).success).toBe(false);
    expect(purchaseCreateSchema.safeParse({ ...ok, supplierId: "../x" }).success).toBe(false);
  });
});

describe("receiveSchema", () => {
  it("validates IMEIs and requires a safe receipt key", () => {
    expect(receiveSchema.safeParse({ receiptKey: "abc123", lines: [{ variantId: "v1", quantity: 1, imeis: [{ imei1: A }] }] }).success).toBe(true);
    expect(receiveSchema.safeParse({ receiptKey: "abc123", lines: [{ variantId: "v1", quantity: 1, imeis: [{ imei1: "123" }] }] }).success).toBe(false);
    expect(receiveSchema.safeParse({ receiptKey: "a/b", lines: [{ variantId: "v1", quantity: 1 }] }).success).toBe(false);
    expect(receiveSchema.safeParse({ receiptKey: "abc123", lines: [] }).success).toBe(false);
  });
});

describe("adjustSchema", () => {
  const base = { variantId: "v1", branchId: "b1", reason: "DAMAGE" };
  it("allows negative and positive whole changes but not zero", () => {
    expect(adjustSchema.safeParse({ ...base, delta: "-3" }).success).toBe(true);
    expect(adjustSchema.safeParse({ ...base, delta: "4" }).success).toBe(true);
    expect(adjustSchema.safeParse({ ...base, delta: "0" }).success).toBe(false);
    expect(adjustSchema.safeParse({ ...base, delta: "1.5" }).success).toBe(false);
    expect(adjustSchema.safeParse({ ...base, delta: "1", reason: "WHIM" }).success).toBe(false);
  });
});

describe("transfer and action schemas", () => {
  it("validates a transfer and the allowed actions", () => {
    expect(transferCreateSchema.safeParse({ fromBranchId: "a", toBranchId: "b", items: [{ variantId: "v", quantity: 1, imeis: [A] }] }).success).toBe(true);
    expect(transferCreateSchema.safeParse({ fromBranchId: "a", toBranchId: "b", items: [{ variantId: "v", quantity: 1, imeis: ["12"] }] }).success).toBe(false);
    expect(transferActionSchema.safeParse({ action: "RECEIVE" }).success).toBe(true);
    expect(transferActionSchema.safeParse({ action: "DELETE" }).success).toBe(false);
    expect(purchaseActionSchema.safeParse({ action: "ORDER" }).success).toBe(true);
    expect(purchaseActionSchema.safeParse({ action: "RECEIVE" }).success).toBe(false);
  });
});
