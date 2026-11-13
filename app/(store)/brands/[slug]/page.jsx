import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { getBrand, getBrands, getByBrand } from "@/services/catalog";

export function generateStaticParams() {
  return getBrands().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const brand = getBrand(slug);
  return brand ? { title: brand.name, description: brand.tagline } : {};
}

async function BrandContent({ params }) {
  const { slug } = await params;
  const brand = getBrand(slug);
  if (!brand) notFound();
  const products = getByBrand(slug);

  return (
    <>
      <PageHeader
        title={brand.name}
        description={brand.tagline}
        crumbs={[{ label: "Brands", href: "/shop" }, { label: brand.name }]}
      />
      <div className="container-page py-10">
        <ProductGrid products={products} />
      </div>
    </>
  );
}

// params ko Suspense ke andar resolve karte hain taake navigation instant rahe (Next 16 instant shell).
export default function BrandPage({ params }) {
  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <BrandContent params={params} />
    </Suspense>
  );
}
