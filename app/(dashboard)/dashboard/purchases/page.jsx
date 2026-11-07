import Link from "next/link";
import { ClipboardList } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { formatPkr } from "@/lib/formatters/money";
import { formatUtcDate } from "@/lib/formatters/date";
import { listPurchases } from "@/lib/inventory/purchases";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Purchases" };

const TONE = { DRAFT: "neutral", ORDERED: "warning", PARTIALLY_RECEIVED: "warning", RECEIVED: "success", CANCELLED: "neutral" };

export default async function PurchasesPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.PURCHASES_READ)) {
    return (
      <>
        <PageHeader title="Purchases" />
        <EmptyState icon={ClipboardList} title="No access" description="Purchases are visible to the owner, managers and accountants." />
      </>
    );
  }
  const purchases = await listPurchases(ctx);
  const canWrite = can(ctx.role, PERMISSIONS.PURCHASES_WRITE);

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Purchase orders to suppliers and goods receiving."
        actions={canWrite ? <Link href="/dashboard/purchases/new" className={buttonVariants()}>New purchase order</Link> : null}
      />
      {purchases.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No purchase orders yet" description="Create one to order stock from a supplier." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Number</th>
                <th scope="col" className="px-4 py-3 font-medium">Supplier</th>
                <th scope="col" className="px-4 py-3 font-medium">Branch</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3"><Link href={`/dashboard/purchases/${p.id}`} className="font-medium underline-offset-4 hover:underline">{p.number}</Link></td>
                  <td className="px-4 py-3">{p.supplierName}</td>
                  <td className="px-4 py-3">{p.branchName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPkr(p.totalCost)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} tone={TONE[p.status]} /></td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">{formatUtcDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
