import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { listActivePlans } from "@/lib/finance/installments";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Installments" };
export const dynamic = "force-dynamic";

const TONE = { OVERDUE: "danger", CURRENT: "info", COMPLETED: "success" };

export default async function InstallmentsPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.SALES_READ)) notFound();
  const { plans, today } = await listActivePlans(ctx);
  const overdue = plans.filter((p) => p.state === "OVERDUE");

  return (
    <>
      <PageHeader title="Installments" description="Open plans, overdue first. Create a plan from a credit sale's invoice." />
      {overdue.length > 0 ? (
        <p role="status" className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          {overdue.length} plan{overdue.length === 1 ? " is" : "s are"} overdue, {formatPkr(overdue.reduce((a, p) => a + p.overdueAmount, 0))} in total (as of {today}).
        </p>
      ) : null}
      {plans.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No open installment plans" description="Sell on credit to a saved customer, then open the invoice and create a plan." />
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y text-sm">
              {plans.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>
                    <Link href={`/dashboard/installments/${p.id}`} className="font-medium underline-offset-4 hover:underline">{p.number}</Link> · {p.customerName || "Customer"} · {p.saleNumber}
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      Outstanding {formatPkr(p.outstanding)}
                      {p.state === "OVERDUE" ? ` · ${formatPkr(p.overdueAmount)} overdue, ${p.maxDaysLate} day${p.maxDaysLate === 1 ? "" : "s"} late` : p.nextDue ? ` · next ${formatPkr(p.nextDue.outstanding)} on ${p.nextDue.dueDate}` : ""}
                    </span>
                  </span>
                  <StatusBadge status={p.state === "OVERDUE" ? "Overdue" : "Current"} tone={TONE[p.state]} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
