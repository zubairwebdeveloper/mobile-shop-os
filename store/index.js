import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "@/store/slices/ui-slice";
import filtersReducer from "@/store/slices/filters-slice";
import cartReducer from "@/store/slices/cart-slice";
import wishlistReducer from "@/store/slices/wishlist-slice";
import comparisonReducer from "@/store/slices/comparison-slice";
import ordersReducer from "@/store/slices/orders-slice";

// Store factory: har provider ke liye naya store (App Router safe).
export function makeStore() {
  return configureStore({
    reducer: {
      ui: uiReducer,
      filters: filtersReducer,
      cart: cartReducer,
      wishlist: wishlistReducer,
      comparison: comparisonReducer,
      orders: ordersReducer,
    },
  });
}
