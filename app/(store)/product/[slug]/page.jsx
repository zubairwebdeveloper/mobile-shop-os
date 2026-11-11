import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ProductDetail } from "@/components/product/product-detail";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeading } from "@/components/shared/section-heading";
import { getAllProducts, getBrandName, getProductBySlug, getRelated } from "@/services/catalog";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return product ? { title: product.name, description: product.summary } : {};
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const related = getRelated(product);

  return (
    <>
      <PageHeader
        title={product.name}
        crumbs={[
          { label: "Shop", href: "/shop" },
          { label: getBrandName(product.brand), href: `/brands/${product.brand}` },
          { label: product.name },
        ]}
      />
      <div className="container-page py-10">
        <ProductDetail product={product} />
        {related.length > 0 && (
          <section className="mt-24" aria-labelledby="related-heading">
            <SectionHeading id="related-heading" eyebrow="You may also like" title="Related products" />
            <ProductGrid products={related} columns="lg:grid-cols-4" />
          </section>
        )}
      </div>
    </>
  );
}
