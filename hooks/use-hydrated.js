"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false jab tak ye component khud hydrate na ho jaye, uske baad true.
// Persisted state (cart / wishlist / compare) sirf iske baad dikhana hai, warna server HTML se mismatch hota hai.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
