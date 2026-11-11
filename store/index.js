import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "@/store/slices/ui-slice";
import filtersReducer from "@/store/slices/filters-slice";

// Store factory: har provider ke liye naya store (App Router safe).
// cart / wishlist / comparison slices Phase 03 mein add hongi.
export function makeStore() {
  return configureStore({
    reducer: {
      ui: uiReducer,
      filters: filtersReducer,
    },
  });
}
