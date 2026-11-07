import { redirect } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import PurchaseForm from "@/features/inventory/components/PurchaseForm";
import { listVariantOptions } from "@/lib/inventory/queries";
import { listSuppliers } from "@/lib/inventory/suppliers";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";

export const metadata = { title: "New purchase order" };

export default async function NewPurchasePage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.PURCHASES_WRITE)) redirect("/dashboard/purchases");
  const [suppliers, branches, variants] = await Promise.all([listSuppliers(ctx), listBranches(ctx), listVariantOptions(ctx)]);

  return (
    <>
      <PageHeader title="New purchase order" />
      <PurchaseForm tenantId={ctx.tenantId} suppliers={suppliers.filter((s) => s.active)} branches={branches.filter((b) => b.active)} variants={variants} />
    </>
  );
}
