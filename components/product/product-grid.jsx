import { PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { cn } from "@/lib/utils";

export function ProductGrid({ products, className, columns = "lg:grid-cols-3 xl:grid-cols-4" }) {
  if (!products.length) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed py-20 text-center">
        <PackageSearch className="size-10 text-muted-foreground" />
        <p className="mt-4 font-heading text-lg font-bold">No products found</p>
        <p className="mt-1 text-sm text-muted-foreground">Try changing or clearing your filters.</p>
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-1 gap-5 min-[480px]:grid-cols-2", columns, className)}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
