"use client";

import { useDispatch, useSelector } from "react-redux";
import { setActiveBranch } from "@/store/slices/branchSlice";

/**
 * Display-only branch filter. Redux holds the choice for the UI; every server query re-checks the
 * member's real branch access (requireTenantAccess with branchId), so this can never widen access.
 * Members limited to one branch see no selector.
 */
export default function BranchSelector() {
  const dispatch = useDispatch();
  const branches = useSelector((state) => state.branch.branches);
  const activeBranchId = useSelector((state) => state.branch.activeBranchId);
  const canSeeAll = useSelector((state) => state.branch.canSeeAll);

  if (branches.length === 0 || (!canSeeAll && branches.length === 1)) return null;

  return (
    <div className="hidden items-center sm:flex">
      <label htmlFor="branch-selector" className="sr-only">
        Branch
      </label>
      <select
        id="branch-selector"
        value={activeBranchId ?? ""}
        onChange={(event) => dispatch(setActiveBranch(event.target.value || null))}
        className="h-9 max-w-44 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {canSeeAll ? <option value="">All branches</option> : null}
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id} className="bg-popover text-popover-foreground">
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
}
