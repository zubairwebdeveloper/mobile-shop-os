import { createSlice } from "@reduxjs/toolkit";
import { hydrateFromStorage } from "@/store/actions";

// Local-only order record for the demo checkout. Phase 04 replaces this with
// server-validated Firestore orders; nothing here is a real, paid or fulfilled order.
const ordersSlice = createSlice({
  name: "orders",
  initialState: { last: null, history: [], hydrated: false },
  reducers: {
    orderPlaced(state, action) {
      state.last = action.payload;
      state.history = [action.payload, ...state.history].slice(0, 10);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateFromStorage, (state, action) => {
      const saved = action.payload?.orders;
      if (saved) {
        state.last = saved.last ?? null;
        state.history = Array.isArray(saved.history) ? saved.history : [];
      }
      state.hydrated = true;
    });
  },
});

export const { orderPlaced } = ordersSlice.actions;
export default ordersSlice.reducer;
