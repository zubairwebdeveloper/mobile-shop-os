import { redirect } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import ProductForm from "@/features/catalog/components/ProductForm";
import { listBrands, listCategories } from "@/lib/catalog/catalog";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.CATALOG_WRITE)) redirect("/dashboard/products");
  const [brands, categories] = await Promise.all([listBrands(ctx), listCategories(ctx)]);

  return (
    <>
      <PageHeader title="New product" />
      <ProductForm tenantId={ctx.tenantId} brands={brands} categories={categories} canManage />
    </>
  );
}
