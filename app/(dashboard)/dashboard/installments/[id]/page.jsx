import Link from "next/link";
import { notFound } from "next/navigation";
import CollectForm from "@/features/finance/components/CollectForm";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlan } from "@/lib/finance/installments";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Installment plan" };
export const dynamic = "force-dynamic";

export default async function PlanPage({ params }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.SALES_READ)) notFound();
  const plan = await getPlan(ctx, id);
  if (!plan) notFound();

  return (
    <>
      <Link href="/dashboard/installments" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">All installments</Link>
      <PageHeader title={plan.number} description={`${plan.customerName || "Customer"} · invoice ${plan.saleNumber}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Schedule ({plan.frequency === "WEEKLY" ? "weekly" : "monthly"})</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm tabular-nums">Plan {formatPkr(plan.principal)} · outstanding {formatPkr(plan.outstanding)}</p>
            <ul className="divide-y text-sm">
              {plan.schedule.map((r) => {
                const late = r.outstanding > 0 && r.dueDate < plan.today;
                return (
                  <li key={r.no} className="flex items-center justify-between gap-2 py-2 tabular-nums">
                    <span>#{r.no} · {r.dueDate}</span>
                    <span>{formatPkr(r.amount)}</span>
                    {r.outstanding === 0 ? <StatusBadge status="Paid" tone="success" /> : late ? <StatusBadge status={`Overdue ${formatPkr(r.outstanding)}`} tone="danger" /> : <StatusBadge status={`Due ${formatPkr(r.outstanding)}`} tone="info" />}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">No interest or late fees are added. If part of the sale is returned, the last installments shrink. <Link href={`/dashboard/sales/${plan.saleId}`} className="underline-offset-4 hover:underline">Open invoice</Link></p>
          </CardContent>
        </Card>
        {plan.saleDue > 0 && can(ctx.role, PERMISSIONS.SALES_CREATE) ? <CollectForm tenantId={ctx.tenantId} targetType="SALE" targetId={plan.saleId} due={plan.saleDue} /> : null}
      </div>
    </>
  );
}
