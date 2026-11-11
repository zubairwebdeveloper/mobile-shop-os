import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ShopClient } from "@/components/shop/shop-client";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Shop",
  description: "Browse smartphones, tablets and accessories. Filter by brand, price, RAM, storage and condition.",
};

function ShopFallback() {
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[17rem_1fr]">
      <Skeleton className="hidden h-96 lg:block" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <>
      <PageHeader
        title="Shop"
        description="Genuine devices with warranty. Use the filters to narrow down your perfect match."
        crumbs={[{ label: "Shop" }]}
      />
      <Suspense fallback={<ShopFallback />}>
        <ShopClient />
      </Suspense>
    </>
  );
}
