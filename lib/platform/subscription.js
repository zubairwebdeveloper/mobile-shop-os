/**
 * PURE helpers for plans and subscriptions (no database, no Next.js): unit-testable.
 */

/** Strict YYYY-MM-DD check: rejects impossible dates such as 2026-02-31. */
export function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Converts validated plan form input into the stored plan document.
 * Price is entered in whole PKR (empty = "contact us") and stored in paisa (integer minor units).
 */
export function buildPlanDoc(input) {
  const features = String(input.features ?? "")
    .split("\n")
    .map((line) => line.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 20);

  return {
    name: input.name,
    description: input.description ?? "",
    priceMonthly: input.priceMonthlyPkr === "" || input.priceMonthlyPkr == null ? null : Number(input.priceMonthlyPkr) * 100,
    currency: "PKR",
    limits: {
      maxBranches: input.maxBranches,
      maxEmployees: input.maxEmployees,
      aiRequestsPerMonth: input.aiRequestsPerMonth,
    },
    features,
    isPublic: input.visibility === "PUBLIC",
    status: input.status ?? "ACTIVE",
    sortOrder: input.sortOrder ?? 0,
  };
}

/** Inverse of buildPlanDoc, used to pre-fill the edit form. */
export function planToFormValues(plan) {
  return {
    name: plan.name,
    description: plan.description ?? "",
    priceMonthlyPkr: plan.priceMonthly == null ? "" : String(Math.round(plan.priceMonthly / 100)),
    maxBranches: String(plan.limits?.maxBranches ?? 1),
    maxEmployees: String(plan.limits?.maxEmployees ?? 1),
    aiRequestsPerMonth: String(plan.limits?.aiRequestsPerMonth ?? 0),
    features: (plan.features ?? []).join("\n"),
    visibility: plan.isPublic ? "PUBLIC" : "HIDDEN",
    status: plan.status ?? "ACTIVE",
    sortOrder: String(plan.sortOrder ?? 0),
  };
}

/**
 * Checks current usage against a plan's limits before a downgrade.
 * Only branches are tracked today; employee usage arrives with Phase 11.
 * Returns human-readable violations (empty array = allowed).
 */
export function findLimitViolations(counters, newLimits) {
  const violations = [];
  const branches = counters?.branches ?? 0;
  if (typeof newLimits?.maxBranches === "number" && branches > newLimits.maxBranches) {
    violations.push(`The shop uses ${branches} branches but the plan allows ${newLimits.maxBranches}.`);
  }
  return violations;
}

/** used/max as 0..1 (can exceed 1). Returns 0 when there is no limit to compare with. */
export function usageRatio(used, max) {
  if (!Number.isFinite(used) || !Number.isFinite(max) || max <= 0) return 0;
  return used / max;
}
