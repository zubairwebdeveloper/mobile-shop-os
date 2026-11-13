import { STORAGE_KEY } from "@/lib/constants/commerce";

// localStorage can be unavailable (private mode, blocked storage) - never throw.
export function loadPersisted() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function pickPersisted(state) {
  return {
    cart: { items: state.cart.items, coupon: state.cart.coupon },
    wishlist: { ids: state.wishlist.ids },
    comparison: { slots: state.comparison.slots },
    orders: { last: state.orders.last, history: state.orders.history },
  };
}

let lastSaved = "";

export function savePersisted(state) {
  try {
    const next = JSON.stringify(pickPersisted(state));
    if (next === lastSaved) return;
    lastSaved = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore quota / access errors */
  }
}
