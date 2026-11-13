import { createSlice } from "@reduxjs/toolkit";
import { hydrateFromStorage } from "@/store/actions";

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: { ids: [], hydrated: false },
  reducers: {
    toggleWishlist(state, action) {
      const id = action.payload;
      state.ids = state.ids.includes(id) ? state.ids.filter((x) => x !== id) : [...state.ids, id];
    },
    clearWishlist(state) {
      state.ids = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateFromStorage, (state, action) => {
      const saved = action.payload?.wishlist;
      if (saved && Array.isArray(saved.ids)) state.ids = saved.ids.filter((x) => typeof x === "string");
      state.hydrated = true;
    });
  },
});

export const { toggleWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
