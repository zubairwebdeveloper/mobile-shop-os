import { describe, expect, it } from "bun:test";
import { customerSchema, repairActionSchema, repairCreateSchema, warrantyActionSchema, warrantyRegisterSchema } from "../../src/lib/validations/crm.js";

describe("customers", () => {
  it("accepts a customer and applies defaults", () => {
    const r = customerSchema.parse({ name: "Ali Khan", phone: "0300 1234567" });
    expect(r).toMatchObject({ vip: false, marketingConsent: false, email: "" });
  });
  it("rejects bad name, phone and email", () => {
    expect(customerSchema.safeParse({ name: "A", phone: "0300 1234567" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "Ali", phone: "12" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "Ali", phone: "03001234567", email: "nope" }).success).toBe(false);
  });
});

describe("warranty", () => {
  const base = { saleId: "sale1", months: "12", startDate: "2026-11-05", items: [{ variantId: "v1", imeis: ["490154203237518"] }] };
  it("accepts a registration", () => {
    expect(warrantyRegisterSchema.parse(base).months).toBe(12);
  });
  it("rejects bad months, dates and IMEIs", () => {
    expect(warrantyRegisterSchema.safeParse({ ...base, months: "0" }).success).toBe(false);
    expect(warrantyRegisterSchema.safeParse({ ...base, months: "61" }).success).toBe(false);
    expect(warrantyRegisterSchema.safeParse({ ...base, startDate: "2026-02-30" }).success).toBe(false);
    expect(warrantyRegisterSchema.safeParse({ ...base, items: [{ variantId: "v1", imeis: ["123"] }] }).success).toBe(false);
    expect(warrantyRegisterSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });
  it("validates actions", () => {
    expect(warrantyActionSchema.safeParse({ action: "VOID", reason: "ab" }).success).toBe(false);
    expect(warrantyActionSchema.safeParse({ action: "CLAIM_ADD", description: "Screen flickers" }).success).toBe(true);
    expect(warrantyActionSchema.safeParse({ action: "CLAIM_UPDATE", claimId: "c1", status: "OPEN" }).success).toBe(false);
  });
});

describe("repairs", () => {
  const base = { branchId: "b1", deviceBrand: "Samsung", deviceModel: "A15", issue: "Cracked screen" };
  it("accepts a job with defaults", () => {
    expect(repairCreateSchema.parse(base)).toMatchObject({ estimatedCost: "0", imei: "", customerName: "" });
  });
  it("normalises or rejects IMEI and rejects bad input", () => {
    expect(repairCreateSchema.parse({ ...base, imei: "490154203237518" }).imei).toBe("490154203237518");
    expect(repairCreateSchema.safeParse({ ...base, imei: "123" }).success).toBe(false);
    expect(repairCreateSchema.safeParse({ ...base, issue: "x" }).success).toBe(false);
    expect(repairCreateSchema.safeParse({ ...base, estimatedCost: "-5" }).success).toBe(false);
    expect(repairCreateSchema.safeParse({ ...base, branchId: "a/b" }).success).toBe(false);
  });
  it("validates actions", () => {
    expect(repairActionSchema.safeParse({ action: "STATUS", status: "DIAGNOSING" }).success).toBe(true);
    expect(repairActionSchema.safeParse({ action: "STATUS", status: "DONE" }).success).toBe(false);
    expect(repairActionSchema.safeParse({ action: "ADD_PART", variantId: "v1", quantity: "2", unitPrice: "300" }).success).toBe(true);
    expect(repairActionSchema.safeParse({ action: "ADD_PART", variantId: "v1", quantity: "0", unitPrice: "300" }).success).toBe(false);
    expect(repairActionSchema.safeParse({ action: "NUKE" }).success).toBe(false);
  });
});
