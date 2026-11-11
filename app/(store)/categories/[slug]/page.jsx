import { notFound } from "next/navigation";
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

export default async function CategoryPage({ params }) {
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
