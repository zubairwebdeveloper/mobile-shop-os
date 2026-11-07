import { Truck } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import SupplierManager from "@/features/inventory/components/SupplierManager";
import { listSuppliers } from "@/lib/inventory/suppliers";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.PURCHASES_READ)) {
    return (
      <>
        <PageHeader title="Suppliers" />
        <EmptyState icon={Truck} title="No access" description="Suppliers are visible to the owner, managers and accountants." />
      </>
    );
  }
  return (
    <>
      <PageHeader title="Suppliers" description="Who you buy from. Payables and payments arrive with the finance phase." />
      <SupplierManager tenantId={ctx.tenantId} suppliers={await listSuppliers(ctx)} canManage={can(ctx.role, PERMISSIONS.PURCHASES_WRITE)} />
    </>
  );
}
