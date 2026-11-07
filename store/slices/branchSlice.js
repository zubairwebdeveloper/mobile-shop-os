import { createSlice } from "@reduxjs/toolkit";
import {
  clearTenantContext,
  setTenantContext,
  setActiveTenant,
} from "./tenantSlice";

const initialState = {
  activeBranchId: null, // null = all branches (only meaningful when canSeeAll)
  branches: [], // [{ id, name }] the member may see, for the ACTIVE tenant only
  canSeeAll: false,
};

const branchSlice = createSlice({
  name: "branch",
  initialState,
  reducers: {
    setBranches(state, action) {
      state.branches = action.payload ?? [];
    },
    // Hydrated from server-verified data. Keeps the current choice if it is still allowed.
    setBranchContext(state, action) {
      const { branches = [], canSeeAll = false } = action.payload ?? {};
      state.branches = branches;
      state.canSeeAll = canSeeAll;
      const stillValid = branches.some((b) => b.id === state.activeBranchId);
      if (!stillValid) state.activeBranchId = canSeeAll ? null : (branches[0]?.id ?? null);
    },
    setActiveBranch(state, action) {
      const id = action.payload;
      if (id === null) {
        if (state.canSeeAll) state.activeBranchId = null;
        return;
      }
      if (state.branches.some((b) => b.id === id)) state.activeBranchId = id;
    },
  },
  // Tenant-scoped cached state must never survive a tenant change.
  extraReducers: (builder) => {
    builder
      .addCase(switchTenant, () => initialState)
      .addCase(setTenantContext, (state) => state)
      .addCase(clearTenantContext, () => initialState);
  },
});

export const { setBranches, setBranchContext, setActiveBranch } = branchSlice.actions;
export default branchSlice.reducer;
