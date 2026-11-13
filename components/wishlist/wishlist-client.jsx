"use client";

import { useSelector } from "react-redux";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/shared/empty-state";
import { getAllProducts } from "@/services/catalog";
import { useHydrated } from "@/hooks/use-hydrated";

export function WishlistClient() {
  const { ids, hydrated: storeReady } = useSelector((state) => state.wishlist);
  const hydrated = useHydrated() && storeReady;

  if (!hydrated) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading wishlist">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    );
  }

  const products = getAllProducts().filter((p) => ids.includes(p.id));

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        description="Tap the heart on any product to save it here for later."
        href="/shop"
        actionLabel="Discover products"
      />
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        {products.length} saved item{products.length === 1 ? "" : "s"}
      </p>
      <ProductGrid products={products} columns="lg:grid-cols-4" />
    </>
  );
}
