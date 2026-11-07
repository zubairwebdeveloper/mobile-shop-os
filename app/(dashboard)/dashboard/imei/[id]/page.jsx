import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import ImeiDetail from "@/features/catalog/components/ImeiDetail";
import { getImeiRecord } from "@/lib/catalog/imei";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";

export const metadata = { title: "Device" };

export default async function ImeiDetailPage({ params }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  const [record, branches] = await Promise.all([getImeiRecord(ctx, id), listBranches(ctx)]);
  if (!record) notFound();

  return (
    <>
      <Link href="/dashboard/imei" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">
        All devices
      </Link>
      <PageHeader title={record.productName} description={record.variantLabel} />
      <ImeiDetail
        key={`${record.id}-${record.status}-${record.branchId}`}
        tenantId={ctx.tenantId}
        record={record}
        branches={branches.filter((b) => b.active)}
        canEdit={can(ctx.role, PERMISSIONS.INVENTORY_ADJUST)}
      />
    </>
  );
}
