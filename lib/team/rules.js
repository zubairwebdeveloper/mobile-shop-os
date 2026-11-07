/**
 * PURE team rules (no database): unit-testable. The services call these inside transactions.
 */

/** Branch scope stored on a member: all branches -> empty list; otherwise unique, existing branch ids only. */
export function normalizeBranchScope({ allBranches, branchIds }, existingBranchIds) {
  if (allBranches) return { allBranches: true, branchIds: [] };
  const existing = new Set(existingBranchIds);
  const unique = [...new Set(branchIds)].filter((id) => existing.has(id));
  return { allBranches: false, branchIds: unique };
}

/**
 * Decides whether a member can be edited by `actorUid`.
 * Returns null when allowed, otherwise a short reason.
 */
export function memberEditBlockReason({ actorUid, targetUid, targetRole }) {
  if (targetRole === "OWNER") return "The owner's access cannot be changed here.";
  if (actorUid === targetUid) return "You cannot change your own access.";
  return null;
}

/** Plan employee limit check. `activeCount` = active members now, `limit` = limits.maxEmployees. */
export function hasSeatAvailable(activeCount, limit) {
  if (typeof limit !== "number") return true; // no limit recorded on this shop
  return activeCount < limit;
}

export function emailsMatch(a, b) {
  return typeof a === "string" && typeof b === "string" && a.trim().toLowerCase() === b.trim().toLowerCase();
}
