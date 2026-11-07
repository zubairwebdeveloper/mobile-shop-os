import PageHeader from "@/components/shared/PageHeader";
import TransferManager from "@/features/inventory/components/TransferManager";
import { listVariantOptions } from "@/lib/inventory/queries";
import { listTransfers } from "@/lib/inventory/transfers";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";

export const metadata = { title: "Branch transfers" };

export default async function TransfersPage() {
  const ctx = await getActiveTenantContext();
  const canManage = can(ctx.role, PERMISSIONS.INVENTORY_ADJUST);
  const [transfers, branches, variants] = await Promise.all([
    listTransfers(ctx),
    listBranches(ctx),
    canManage ? listVariantOptions(ctx) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="Branch transfers" description="Stock leaves the source branch when you send it and arrives when the destination receives it." />
      <TransferManager
        tenantId={ctx.tenantId}
        transfers={transfers}
        branches={branches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }))}
        myBranchIds={ctx.branchIds}
        canSeeAll={ctx.allBranches}
        variants={variants}
        canManage={canManage}
      />
    </>
  );
}
