import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";
import ExpenseForm from "@/features/finance/components/ExpenseForm";
import VoidExpense from "@/features/finance/components/VoidExpense";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listExpenses } from "@/lib/finance/expenses";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Expenses" };
export const dynamic = "force-dynamic";

const label = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default async function ExpensesPage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.FINANCE_READ)) notFound();
  const sp = await searchParams;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const canWrite = can(ctx.role, PERMISSIONS.FINANCE_WRITE);
  const [{ entries, nextCursor }, branches, shop] = await Promise.all([listExpenses(ctx, { cursor }), listBranches(ctx), getShopSettings(ctx)]);
  const mine = branches.filter((b) => b.active && (ctx.allBranches || ctx.branchIds.includes(b.id))).map((b) => ({ id: b.id, name: b.name }));

  return (
    <>
      <PageHeader title="Expenses" description="Newest first. Expenses are never deleted; a wrong one is voided and stops counting." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Expenses">
          {entries.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses yet" description="Add the first one on the right." />
          ) : (
            <Card>
              <CardContent>
                <ul className="divide-y text-sm">
                  {entries.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <span className={e.status === "VOIDED" ? "text-muted-foreground line-through" : ""}>
                        <span className="font-medium">{label(e.category)}</span> · {e.number}
                        <span className="block text-xs text-muted-foreground tabular-nums">{e.date} · {e.branchName} · {label(e.method)}{e.paidTo ? ` · ${e.paidTo}` : ""}</span>
                      </span>
                      <span className="flex items-center gap-2 tabular-nums">
                        {formatPkr(e.amount)}
                        {e.status === "VOIDED" ? <StatusBadge status="Voided" tone="neutral" /> : canWrite ? <VoidExpense tenantId={ctx.tenantId} id={e.id} /> : null}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  {cursor ? <Link href="/dashboard/expenses" className={buttonVariants({ variant: "outline" })}>Back to newest</Link> : null}
                  {nextCursor ? <Link href={`/dashboard/expenses?cursor=${encodeURIComponent(nextCursor)}`} className={buttonVariants({ variant: "outline" })}>Older</Link> : null}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
        {canWrite ? <ExpenseForm tenantId={ctx.tenantId} branches={mine} today={dayKey(new Date(), shop.timezone)} /> : null}
      </div>
    </>
  );
}
