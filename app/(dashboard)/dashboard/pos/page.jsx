import { redirect } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import PosTerminal from "@/features/sales/components/PosTerminal";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.SALES_CREATE)) redirect("/dashboard");
  const branches = (await listBranches(ctx)).filter((b) => b.active);
  return (
    <>
      <PageHeader title="Point of sale" description="Tap products or scan a barcode or IMEI. Stock and prices are checked again on the server when you complete the sale." />
      <PosTerminal tenantId={ctx.tenantId} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
    </>
  );
}
