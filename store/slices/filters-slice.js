import { createSlice } from "@reduxjs/toolkit";
import { MAX_PRICE } from "@/lib/constants/catalog";

export const initialFilters = {
  search: "",
  brands: [],
  categories: [],
  rams: [],
  storages: [],
  conditions: [],
  price: [0, MAX_PRICE],
  inStockOnly: false,
  sort: "featured",
};

const ARRAY_KEYS = ["brands", "categories", "rams", "storages", "conditions"];

const filtersSlice = createSlice({
  name: "filters",
  initialState: initialFilters,
  reducers: {
    setSearch(state, action) {
      state.search = action.payload;
    },
    toggleFilter(state, action) {
      const { key, value } = action.payload;
      if (!ARRAY_KEYS.includes(key)) return;
      const list = state[key];
      state[key] = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    },
    setPrice(state, action) {
      state.price = action.payload;
    },
    setInStockOnly(state, action) {
      state.inStockOnly = Boolean(action.payload);
    },
    setSort(state, action) {
      state.sort = action.payload;
    },
    resetFilters() {
      return initialFilters;
    },
  },
});

export const { setSearch, toggleFilter, setPrice, setInStockOnly, setSort, resetFilters } =
  filtersSlice.actions;
export default filtersSlice.reducer;
