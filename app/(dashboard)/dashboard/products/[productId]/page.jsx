import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import ProductForm from "@/features/catalog/components/ProductForm";
import VariantManager from "@/features/catalog/components/VariantManager";
import { getProduct, listBrands, listCategories } from "@/lib/catalog/catalog";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";


export async function generateMetadata() {
  return { title: "Product" };
}

export default async function ProductPage({ params }) {
  const { productId } = await params;
  const ctx = await getActiveTenantContext();
  const [product, brands, categories] = await Promise.all([getProduct(ctx, productId), listBrands(ctx), listCategories(ctx)]);
  if (!product) notFound();
  const canManage = can(ctx.role, PERMISSIONS.CATALOG_WRITE);

  return (
    <>
      <Link href="/dashboard/products" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">
        All products
      </Link>
      <PageHeader title={product.name} description={`${product.brandName} · ${product.categoryName}${product.tracksImei ? " · IMEI tracked" : ""}`} />
      <div className="space-y-8">
        <ProductForm key={`${product.id}-${product.name}-${product.status}`} tenantId={ctx.tenantId} product={product} brands={brands} categories={categories} canManage={canManage} />
        <div>
          <h2 className="mb-4 font-heading text-xl font-semibold">Variants</h2>
          <VariantManager tenantId={ctx.tenantId} productId={product.id} variants={product.variants} canManage={canManage} />
        </div>
      </div>
    </>
  );
}
