import PageHeader from "@/components/shared/PageHeader";
import CatalogueManager from "@/features/catalog/components/CatalogueManager";
import { listBrands, listCategories } from "@/lib/catalog/catalog";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Categories and brands" };

export default async function CataloguePage() {
  const ctx = await getActiveTenantContext();
  const [categories, brands] = await Promise.all([listCategories(ctx), listBrands(ctx)]);
  return (
    <>
      <PageHeader title="Categories and brands" description="Set up how your products are grouped. Turn IMEI tracking on for phone and tablet categories." />
      <CatalogueManager tenantId={ctx.tenantId} categories={categories} brands={brands} canManage={can(ctx.role, PERMISSIONS.CATALOG_WRITE)} />
    </>
  );
}
