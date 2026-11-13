"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { addItem } from "@/store/slices/cart-slice";
import { toggleWishlist } from "@/store/slices/wishlist-slice";
import { toggleCompare } from "@/store/slices/comparison-slice";
import { buildCartItem } from "@/lib/cart/items";
import { MAX_COMPARE } from "@/lib/constants/commerce";

export function useShoppingActions() {
  const dispatch = useDispatch();
  const router = useRouter();

  const addToCart = useCallback(
    (product, selection, qty = 1) => {
      if (product.stock <= 0) {
        toast.error(`${product.name} is out of stock`);
        return;
      }
      dispatch(addItem(buildCartItem(product, selection, qty)));
      toast.success(`${product.name} added to cart`, {
        action: { label: "View cart", onClick: () => router.push("/cart") },
      });
    },
    [dispatch, router],
  );

  const toggleWish = useCallback(
    (product, wished) => {
      dispatch(toggleWishlist(product.id));
      toast(wished ? "Removed from wishlist" : `${product.name} saved to wishlist`);
    },
    [dispatch],
  );

  const toggleComparison = useCallback(
    (product, slots) => {
      const inList = slots.includes(product.id);
      if (!inList && !slots.includes("")) {
        toast.error(`You can compare up to ${MAX_COMPARE} phones. Remove one first.`);
        return;
      }
      dispatch(toggleCompare(product.id));
      toast(inList ? "Removed from comparison" : "Added to comparison", {
        action: inList ? undefined : { label: "Compare", onClick: () => router.push("/compare") },
      });
    },
    [dispatch, router],
  );

  return { addToCart, toggleWish, toggleComparison };
}
