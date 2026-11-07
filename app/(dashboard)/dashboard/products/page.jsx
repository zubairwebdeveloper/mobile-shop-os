import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import ProductTable from "@/features/catalog/components/ProductTable";
import { listCategories, listProducts } from "@/lib/catalog/catalog";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const ctx = await getActiveTenantContext();
  const [products, categories] = await Promise.all([listProducts(ctx), listCategories(ctx)]);
  const canManage = can(ctx.role, PERMISSIONS.CATALOG_WRITE);

  return (
    <>
      <PageHeader
        title="Products"
        description="Your catalogue. Prices and options live on each product's variants."
        actions={
          canManage ? (
            <Link href="/dashboard/products/new" className={buttonVariants()}>
              New product
            </Link>
          ) : null
        }
      />
      <ProductTable products={products} categories={categories} />
    </>
  );
}
