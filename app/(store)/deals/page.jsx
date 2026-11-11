import { Flame } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { getDeals } from "@/services/catalog";

export const metadata = {
  title: "Deals",
  description: "Discounted smartphones and accessories with full warranty.",
};

export default function DealsPage() {
  const deals = getDeals();
  return (
    <>
      <PageHeader
        title="Hot deals"
        description="Biggest savings first. Prices and stock are shown from our demo catalog."
        crumbs={[{ label: "Deals" }]}
      />
      <div className="container-page py-10">
        <p className="mb-6 flex items-center gap-2 text-sm font-semibold text-accent">
          <Flame className="size-4" /> {deals.length} discounted products
        </p>
        <ProductGrid products={deals} />
      </div>
    </>
  );
}
