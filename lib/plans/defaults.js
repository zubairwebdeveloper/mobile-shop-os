/**
 * PLACEHOLDER plan defaults used when a tenant is created in Phase 3.
 * The numbers below are NOT a pricing decision. Real plans, trials and entitlements are
 * defined by the platform owner in Phase 17 (stored in platformPlans/*); until then every new
 * tenant gets these snapshot limits so server-side limit checks already have something to enforce.
 */
export const DEFAULT_PLAN_ID = "starter";

export const DEFAULT_LIMITS = Object.freeze({
  maxBranches: 3,
  maxEmployees: 10,
  aiRequestsPerMonth: 0,
});
