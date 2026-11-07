import { describe, expect, it } from "vitest";
import {
  planCreateSchema,
  planIdSchema,
  subscriptionSchema,
  suspendFormSchema,
  tenantStatusSchema,
} from "@/lib/validations/platform";

const plan = (o = {}) => ({
  id: "starter",
  name: "Starter",
  priceMonthlyPkr: "",
  maxBranches: "1",
  maxEmployees: "3",
  aiRequestsPerMonth: "0",
  visibility: "HIDDEN",
  ...o,
});

describe("planIdSchema", () => {
  it("lowercases and accepts valid ids", () => {
    expect(planIdSchema.parse(" Starter ")).toBe("starter");
    expect(planIdSchema.parse("pro-2")).toBe("pro-2");
  });
  it("rejects unsafe ids", () => {
    for (const bad of ["a", "1abc", "-abc", "a/b", "a b", "a".repeat(31), "../x"]) {
      expect(planIdSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("planCreateSchema", () => {
  it("accepts a minimal plan and coerces numeric strings", () => {
    const parsed = planCreateSchema.parse(plan());
    expect(parsed.maxBranches).toBe(1);
    expect(parsed.status).toBe("ACTIVE");
  });
  it("rejects bad numbers, price and visibility", () => {
    expect(planCreateSchema.safeParse(plan({ maxBranches: "0" })).success).toBe(false);
    expect(planCreateSchema.safeParse(plan({ maxBranches: "1.5" })).success).toBe(false);
    expect(planCreateSchema.safeParse(plan({ priceMonthlyPkr: "-5" })).success).toBe(false);
    expect(planCreateSchema.safeParse(plan({ priceMonthlyPkr: "12.5" })).success).toBe(false);
    expect(planCreateSchema.safeParse(plan({ visibility: "MAYBE" })).success).toBe(false);
  });
});

describe("subscriptionSchema", () => {
  const ok = { planId: "starter", status: "ACTIVE", renewsAt: "2026-12-01" };
  it("accepts valid input and empty renewal", () => {
    expect(subscriptionSchema.safeParse(ok).success).toBe(true);
    expect(subscriptionSchema.safeParse({ ...ok, renewsAt: "" }).success).toBe(true);
  });
  it("rejects impossible dates and unknown status", () => {
    expect(subscriptionSchema.safeParse({ ...ok, renewsAt: "2026-02-31" }).success).toBe(false);
    expect(subscriptionSchema.safeParse({ ...ok, status: "FREE" }).success).toBe(false);
  });
});

describe("tenantStatusSchema", () => {
  it("requires a reason to suspend", () => {
    expect(tenantStatusSchema.safeParse({ action: "SUSPEND" }).success).toBe(false);
    expect(tenantStatusSchema.safeParse({ action: "SUSPEND", reason: "  ab " }).success).toBe(false);
    expect(tenantStatusSchema.safeParse({ action: "SUSPEND", reason: "Unpaid invoice" }).success).toBe(true);
  });
  it("does not need a reason to reactivate and rejects other actions", () => {
    expect(tenantStatusSchema.safeParse({ action: "REACTIVATE" }).success).toBe(true);
    expect(tenantStatusSchema.safeParse({ action: "DELETE" }).success).toBe(false);
  });
});

describe("suspendFormSchema", () => {
  it("needs 3+ characters", () => {
    expect(suspendFormSchema.safeParse({ reason: "ab" }).success).toBe(false);
    expect(suspendFormSchema.safeParse({ reason: "abc" }).success).toBe(true);
  });
});
