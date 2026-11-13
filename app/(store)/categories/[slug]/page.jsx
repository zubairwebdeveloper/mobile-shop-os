import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { getByCategory, getCategories, getCategory } from "@/services/catalog";

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = getCategory(slug);
  return category ? { title: category.name, description: category.text } : {};
}

async function CategoryContent({ params }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const products = getByCategory(slug);

  return (
    <>
      <PageHeader
        title={category.name}
        description={category.text}
        crumbs={[{ label: "Categories", href: "/shop" }, { label: category.name }]}
      />
      <div className="container-page py-10">
        <ProductGrid products={products} />
      </div>
    </>
  );
}

// params ko Suspense ke andar resolve karte hain taake navigation instant rahe (Next 16 instant shell).
export default function CategoryPage({ params }) {
  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}
