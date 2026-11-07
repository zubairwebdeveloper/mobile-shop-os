import { describe, expect, it } from "vitest";
import { formatUtc, formatUtcDate } from "@/lib/formatters/date";
import { buildPlanDoc, findLimitViolations, isValidDateString, planToFormValues, usageRatio } from "@/lib/platform/subscription";

describe("isValidDateString", () => {
  it("accepts real dates", () => {
    expect(isValidDateString("2026-11-01")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true);
  });
  it("rejects impossible or malformed dates", () => {
    for (const bad of ["2026-02-31", "2027-02-29", "2026-13-01", "2026-1-1", "01-11-2026", "", "2026-11-01T00:00", null, 20261101]) {
      expect(isValidDateString(bad)).toBe(false);
    }
  });
});

const form = (o = {}) => ({
  name: "Starter",
  description: "",
  priceMonthlyPkr: "2500",
  maxBranches: 2,
  maxEmployees: 5,
  aiRequestsPerMonth: 0,
  features: "POS\n  Inventory  \n\n",
  visibility: "PUBLIC",
  status: "ACTIVE",
  sortOrder: 1,
  ...o,
});

describe("buildPlanDoc", () => {
  it("stores the price in paisa and maps visibility", () => {
    const doc = buildPlanDoc(form());
    expect(doc.priceMonthly).toBe(250000);
    expect(doc.isPublic).toBe(true);
    expect(doc.limits).toEqual({ maxBranches: 2, maxEmployees: 5, aiRequestsPerMonth: 0 });
    expect(buildPlanDoc(form({ visibility: "HIDDEN" })).isPublic).toBe(false);
  });
  it("uses null for an empty price (contact us), but keeps a real 0", () => {
    expect(buildPlanDoc(form({ priceMonthlyPkr: "" })).priceMonthly).toBeNull();
    expect(buildPlanDoc(form({ priceMonthlyPkr: "0" })).priceMonthly).toBe(0);
  });
  it("trims, drops blank feature lines, caps count and length", () => {
    expect(buildPlanDoc(form()).features).toEqual(["POS", "Inventory"]);
    const many = Array.from({ length: 30 }, (_, i) => `f${i}`).join("\n");
    expect(buildPlanDoc(form({ features: many })).features).toHaveLength(20);
    expect(buildPlanDoc(form({ features: "x".repeat(200) })).features[0]).toHaveLength(80);
  });
});

describe("planToFormValues", () => {
  it("round-trips through buildPlanDoc", () => {
    const doc = buildPlanDoc(form());
    const values = planToFormValues(doc);
    expect(values.priceMonthlyPkr).toBe("2500");
    expect(values.visibility).toBe("PUBLIC");
    expect(values.features).toBe("POS\nInventory");
    expect(planToFormValues({ ...doc, priceMonthly: null }).priceMonthlyPkr).toBe("");
  });
});

describe("findLimitViolations", () => {
  it("blocks when usage is above the new limit", () => {
    expect(findLimitViolations({ branches: 4 }, { maxBranches: 3 })).toHaveLength(1);
  });
  it("allows equal or lower usage and missing counters", () => {
    expect(findLimitViolations({ branches: 3 }, { maxBranches: 3 })).toEqual([]);
    expect(findLimitViolations(undefined, { maxBranches: 1 })).toEqual([]);
    expect(findLimitViolations({ branches: 9 }, {})).toEqual([]);
  });
});

describe("usageRatio", () => {
  it("computes the ratio and guards bad input", () => {
    expect(usageRatio(2, 4)).toBe(0.5);
    expect(usageRatio(5, 4)).toBe(1.25);
    expect(usageRatio(1, 0)).toBe(0);
    expect(usageRatio(undefined, 3)).toBe(0);
    expect(usageRatio(1, undefined)).toBe(0);
  });
});

describe("formatUtc", () => {
  it("is deterministic and UTC", () => {
    expect(formatUtc("2026-11-01T14:05:59.000Z")).toBe("2026-11-01 14:05 UTC");
    expect(formatUtcDate("2026-11-01T23:59:00.000Z")).toBe("2026-11-01");
  });
  it("returns a dash for empty or invalid input", () => {
    expect(formatUtc(null)).toBe("—");
    expect(formatUtc("nope")).toBe("—");
    expect(formatUtcDate(undefined)).toBe("—");
  });
});
