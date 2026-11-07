import Link from "next/link";
import { notFound } from "next/navigation";
import CollectForm from "@/features/finance/components/CollectForm";
import RepairDetail from "@/features/crm/components/RepairDetail";
import PageHeader from "@/components/shared/PageHeader";
import { col } from "@/lib/inventory/common";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getRepair, listTechnicians } from "@/lib/repairs/repairs";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Repair job" };
export const dynamic = "force-dynamic";

export default async function RepairPage({ params }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.REPAIRS_READ)) notFound();
  const repair = await getRepair(ctx, id);
  if (!repair) notFound();
  const canWrite = can(ctx.role, PERMISSIONS.REPAIRS_WRITE);

  let technicians = [];
  let partOptions = [];
  if (canWrite) {
    const [techs, products, variants] = await Promise.all([
      listTechnicians(ctx, repair.branchId),
      col(ctx, "products").where("status", "==", "ACTIVE").limit(1000).get(),
      col(ctx, "productVariants").where("status", "==", "ACTIVE").limit(1000).get(),
    ]);
    technicians = techs;
    const plain = new Map(products.docs.filter((p) => p.data().tracksImei !== true).map((p) => [p.id, p.data().name]));
    partOptions = variants.docs
      .filter((v) => plain.has(v.data().productId))
      .map((v) => ({ value: v.id, label: `${plain.get(v.data().productId)}${v.data().storage || v.data().color ? ` (${[v.data().storage, v.data().color].filter(Boolean).join(" ")})` : ""}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  return (
    <>
      <Link href="/dashboard/repairs" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">All repairs</Link>
      <PageHeader title={repair.number} description={repair.customerName || "Repair job"} />
      <RepairDetail key={`${repair.id}-${repair.status}-${repair.history.length}-${repair.parts.length}`} tenantId={ctx.tenantId} repair={repair} technicians={technicians} partOptions={partOptions} canWrite={canWrite} />
      {repair.status === "DELIVERED" && repair.dueAmount > 0 && can(ctx.role, PERMISSIONS.SALES_CREATE) ? (
        <div className="mt-6"><CollectForm key={`${repair.id}-c-${repair.dueAmount}`} tenantId={ctx.tenantId} targetType="REPAIR" targetId={repair.id} due={repair.dueAmount} /></div>
      ) : null}
    </>
  );
}
