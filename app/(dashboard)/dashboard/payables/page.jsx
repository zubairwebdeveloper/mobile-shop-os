import Link from "next/link";
import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import PaySupplierForm from "@/features/finance/components/PaySupplierForm";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPayables } from "@/lib/finance/payables";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Supplier payables" };
export const dynamic = "force-dynamic";

export default async function PayablesPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.FINANCE_READ)) notFound();
  const canWrite = can(ctx.role, PERMISSIONS.FINANCE_WRITE);
  const { total, purchases, suppliers } = await listPayables(ctx);

  return (
    <>
      <PageHeader title="Supplier payables" description="What you owe: goods actually received (received quantity x cost) minus payments. Goods ordered but not received are not counted." />
      {purchases.length === 0 ? (
        <EmptyState icon={Truck} title="You owe no suppliers" description="Receive goods on a purchase order and the amount shows here." />
      ) : (
        <div className="space-y-6">
          <p className="text-sm tabular-nums">Total owed: <strong>{formatPkr(total)}</strong></p>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">By supplier</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">{suppliers.map((s) => <li key={s.supplierId} className="flex justify-between py-2 tabular-nums"><span>{s.supplierName} ({s.purchases} purchase{s.purchases === 1 ? "" : "s"})</span><span>{formatPkr(s.payable)}</span></li>)}</ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">By purchase order</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {purchases.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                    <span><Link href={`/dashboard/purchases/${p.id}`} className="font-medium underline-offset-4 hover:underline">{p.number}</Link> · {p.supplierName}
                      <span className="block text-xs text-muted-foreground tabular-nums">Received value {formatPkr(p.receivedValue)} · paid {formatPkr(p.paidAmount)}</span></span>
                    <span className="flex flex-col items-end tabular-nums">{formatPkr(p.payable)}{canWrite ? <PaySupplierForm tenantId={ctx.tenantId} purchaseId={p.id} payable={p.payable} /> : null}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
