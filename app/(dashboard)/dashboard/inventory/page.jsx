import PageHeader from "@/components/shared/PageHeader";
import StockOverview from "@/features/inventory/components/StockOverview";
import { getLowStock, listInventory, listVariantOptions } from "@/lib/inventory/queries";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const ctx = await getActiveTenantContext();
  const canAdjust = can(ctx.role, PERMISSIONS.INVENTORY_ADJUST);
  const [stock, branches, lowStock, variants] = await Promise.all([
    listInventory(ctx),
    listBranches(ctx),
    getLowStock(ctx),
    canAdjust ? listVariantOptions(ctx) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="Inventory" description="Stock per branch. Phones with IMEI are counted from their in-stock devices; other products from quantities." />
      <StockOverview
        tenantId={ctx.tenantId}
        stock={stock}
        branches={branches.filter((b) => b.active)}
        lowStock={lowStock}
        adjustVariants={variants.filter((v) => !v.tracksImei).map((v) => ({ value: v.id, label: `${v.productName} (${v.variantLabel})` }))}
        canAdjust={canAdjust}
        canRecount={canAdjust && ctx.allBranches}
      />
    </>
  );
}
