import { createSlice } from "@reduxjs/toolkit";
import { MAX_COMPARE } from "@/lib/constants/commerce";
import { hydrateFromStorage } from "@/store/actions";

const comparisonSlice = createSlice({
  name: "comparison",
  // Fixed-size slots so the compare page can keep positions stable. "" = empty slot.
  initialState: { slots: Array(MAX_COMPARE).fill(""), hydrated: false },
  reducers: {
    toggleCompare(state, action) {
      const id = action.payload;
      const at = state.slots.indexOf(id);
      if (at !== -1) {
        state.slots[at] = "";
        return;
      }
      const free = state.slots.indexOf("");
      if (free !== -1) state.slots[free] = id;
    },
    setCompareSlot(state, action) {
      const { index, id } = action.payload;
      if (index < 0 || index >= MAX_COMPARE) return;
      if (id && state.slots.some((s, i) => i !== index && s === id)) return;
      state.slots[index] = id || "";
    },
    clearCompare(state) {
      state.slots = Array(MAX_COMPARE).fill("");
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateFromStorage, (state, action) => {
      const saved = action.payload?.comparison;
      if (saved && Array.isArray(saved.slots) && saved.slots.length === MAX_COMPARE) {
        state.slots = saved.slots.map((s) => (typeof s === "string" ? s : ""));
      }
      state.hydrated = true;
    });
  },
});

export const { toggleCompare, setCompareSlot, clearCompare } = comparisonSlice.actions;
export default comparisonSlice.reducer;
