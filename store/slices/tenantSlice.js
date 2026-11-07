import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  tenantId: null,
  role: null,
  allBranches: false,
  branchIds: [],
  tenant: null,
  tenants: [],
  hydrated: false,
};

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    setTenantContext: (state, action) => {
      const payload = action.payload ?? {};

      state.tenantId = payload.tenantId ?? null;
      state.role = payload.role ?? null;
      state.allBranches = payload.allBranches === true;
      state.branchIds = Array.isArray(payload.branchIds)
        ? payload.branchIds
        : [];
      state.tenant = payload.tenant ?? null;
      state.tenants = Array.isArray(payload.tenants) ? payload.tenants : [];
      state.hydrated = true;
    },

    clearTenantContext: () => initialState,

    setActiveTenant: (state, action) => {
      state.tenantId = action.payload ?? null;
    },
  },
});

export const { setTenantContext, clearTenantContext, setActiveTenant } =
  tenantSlice.actions;

export default tenantSlice.reducer;
