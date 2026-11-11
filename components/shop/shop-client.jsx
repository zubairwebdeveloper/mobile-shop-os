"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FiltersPanel } from "@/components/shop/filters-panel";
import { ProductGrid } from "@/components/product/product-grid";
import { SORT_OPTIONS } from "@/lib/constants/catalog";
import { filterProducts, getAllProducts } from "@/services/catalog";
import { setSearch, setSort } from "@/store/slices/filters-slice";

export function ShopClient() {
  const dispatch = useDispatch();
  const params = useSearchParams();
  const q = params.get("q");
  const filters = useSelector((state) => state.filters);

  useEffect(() => {
    if (q !== null) dispatch(setSearch(q));
  }, [q, dispatch]);

  const products = useMemo(() => filterProducts(getAllProducts(), filters), [filters]);

  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[17rem_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border bg-card p-5 shadow-soft">
          <FiltersPanel />
        </div>
      </aside>

      <div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => dispatch(setSearch(e.target.value))}
              placeholder="Search phones, brands..."
              aria-label="Search products"
              className="pl-9"
            />
          </div>

          <Sheet>
            <SheetTrigger className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold lg:hidden">
              <SlidersHorizontal className="size-4" /> Filters
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader className="sr-only">
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Filter the product list</SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto p-5 pt-10">
                <FiltersPanel />
              </div>
            </SheetContent>
          </Sheet>

          <div className="w-full sm:w-56">
            <Select value={filters.sort} onValueChange={(v) => dispatch(setSort(v))}>
              <SelectTrigger aria-label="Sort products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mb-5 text-sm text-muted-foreground" aria-live="polite">
          Showing <span className="font-semibold text-foreground">{products.length}</span> product
          {products.length === 1 ? "" : "s"}
        </p>
        <ProductGrid products={products} columns="xl:grid-cols-3" />
      </div>
    </div>
  );
}
