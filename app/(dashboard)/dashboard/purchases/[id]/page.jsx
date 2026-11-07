import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import PurchaseDetail from "@/features/inventory/components/PurchaseDetail";
import { listProducts } from "@/lib/catalog/catalog";
import { getPurchase } from "@/lib/inventory/purchases";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Purchase order" };

export default async function PurchasePage({ params }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.PURCHASES_READ)) notFound();
  const purchase = await getPurchase(ctx, id);
  if (!purchase) notFound();

  const tracking = new Map((await listProducts(ctx)).map((p) => [p.id, p.tracksImei]));
  const trackedByVariant = Object.fromEntries(purchase.items.map((i) => [i.variantId, tracking.get(i.productId) === true]));

  return (
    <>
      <Link href="/dashboard/purchases" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">All purchases</Link>
      <PageHeader title={purchase.number} description={purchase.supplierName} />
      <PurchaseDetail
        key={`${purchase.id}-${purchase.status}-${purchase.items.map((i) => i.receivedQty).join("-")}`}
        tenantId={ctx.tenantId}
        purchase={purchase}
        trackedByVariant={trackedByVariant}
        canWrite={can(ctx.role, PERMISSIONS.PURCHASES_WRITE)}
      />
    </>
  );
}
