import { createSlice } from "@reduxjs/toolkit";
import { MAX_LINE_QTY } from "@/lib/constants/commerce";
import { hydrateFromStorage } from "@/store/actions";

const initialState = { items: [], coupon: null, hydrated: false };

const clampQty = (qty, maxStock) => Math.max(1, Math.min(Math.floor(qty) || 1, maxStock || MAX_LINE_QTY, MAX_LINE_QTY));

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action) {
      const incoming = action.payload;
      const existing = state.items.find((i) => i.key === incoming.key);
      if (existing) {
        existing.qty = clampQty(existing.qty + incoming.qty, existing.maxStock);
      } else {
        state.items.push({ ...incoming, qty: clampQty(incoming.qty, incoming.maxStock) });
      }
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.key !== action.payload);
    },
    setQty(state, action) {
      const { key, qty } = action.payload;
      const item = state.items.find((i) => i.key === key);
      if (item) item.qty = clampQty(qty, item.maxStock);
    },
    clearCart(state) {
      state.items = [];
      state.coupon = null;
    },
    applyCoupon(state, action) {
      state.coupon = action.payload;
    },
    removeCoupon(state) {
      state.coupon = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateFromStorage, (state, action) => {
      const saved = action.payload?.cart;
      if (saved && Array.isArray(saved.items)) {
        state.items = saved.items.filter((i) => i && i.key && i.unitPrice > 0 && i.qty > 0);
        state.coupon = saved.coupon ?? null;
      }
      state.hydrated = true;
    });
  },
});

export const { addItem, removeItem, setQty, clearCart, applyCoupon, removeCoupon } = cartSlice.actions;
export default cartSlice.reducer;
