import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { financeReport, receivables } from "@/lib/finance/reports";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { getShopSettings } from "@/lib/tenant/settings";
import { periodSchema } from "@/lib/validations/finance";

export const metadata = { title: "Finance" };
export const dynamic = "force-dynamic";

const label = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Line({ name, value, strong, note }) {
  return (
    <li className={`flex justify-between gap-3 py-2 tabular-nums ${strong ? "font-semibold" : ""}`}>
      <span>{name}{note ? <span className="block text-xs font-normal text-muted-foreground">{note}</span> : null}</span>
      <span>{formatPkr(value)}</span>
    </li>
  );
}

export default async function FinancePage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.FINANCE_READ)) notFound();
  const sp = await searchParams;
  const shop = await getShopSettings(ctx);
  const today = dayKey(new Date(), shop.timezone);
  const parsed = periodSchema.safeParse({ from: sp.from ?? `${today.slice(0, 7)}-01`, to: sp.to ?? today, branchId: sp.branchId || undefined });
  const branches = (await listBranches(ctx)).filter((b) => ctx.allBranches || ctx.branchIds.includes(b.id));
  const period = parsed.success ? parsed.data : null;

  let report = null;
  let owed = null;
  let error = null;
  if (period) {
    try {
      [report, owed] = await Promise.all([financeReport(ctx, period), receivables(ctx, { branchId: period.branchId })]);
    } catch (e) {
      error = e?.status === 403 ? "You cannot view that branch." : e?.message ?? "The report could not be built.";
    }
  } else {
    error = parsed.error.issues[0]?.message ?? "Check the dates.";
  }
  const q = period ? `from=${period.from}&to=${period.to}${period.branchId ? `&branchId=${period.branchId}` : ""}` : "";
  const base = `/api/tenants/${ctx.tenantId}/finance/export`;

  return (
    <>
      <PageHeader title="Finance" description="Revenue, profit and cash are different numbers. Revenue is not profit." />
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm">From <Input type="date" name="from" defaultValue={sp.from ?? `${today.slice(0, 7)}-01`} /></label>
        <label className="text-sm">To <Input type="date" name="to" defaultValue={sp.to ?? today} /></label>
        <label className="text-sm">Branch
          <select name="branchId" defaultValue={sp.branchId ?? ""} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">{ctx.allBranches ? "All branches" : "My branches"}</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <Button type="submit">Show</Button>
      </form>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {report ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 print:hidden">
            <a className={buttonVariants({ variant: "outline" })} href={`${base}?type=report&${q}`}>Download report (CSV)</a>
            <a className={buttonVariants({ variant: "outline" })} href={`${base}?type=expenses&${q}`}>Expenses (CSV)</a>
            <a className={buttonVariants({ variant: "outline" })} href={`${base}?type=payments&${q}`}>Collections (CSV)</a>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/expenses">Expenses</Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/payables">Payables</Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/reconciliation">Reconciliation</Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">Profit and loss</CardTitle><CardDescription>{report.period.from} to {report.period.to} ({report.period.timezone})</CardDescription></CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  <Line name="Net sales (after returns, without tax)" value={report.revenue.netSales} />
                  <Line name="Repair revenue (jobs handed over)" value={report.revenue.repairRevenue} />
                  <Line name="Total revenue" value={report.revenue.total} strong />
                  <Line name="Cost of goods sold" value={-report.costs.cogs} />
                  <Line name="Repair parts cost" value={-report.costs.repairPartsCost} />
                  <Line name="Gross profit" value={report.grossProfit} strong />
                  <Line name="Expenses" value={-report.expenses.total} />
                  <Line name="Net profit" value={report.netProfit} strong />
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">Tax collected {formatPkr(report.revenue.taxCollected)} is held for the government and is not revenue. Stock purchases are not expenses; their cost enters profit when the goods are sold.</p>
                {report.costs.unknownCostSales > 0 || report.costs.unknownCostParts > 0 ? (
                  <p role="status" className="mt-2 text-xs text-destructive">
                    Cost is unknown for {report.costs.unknownCostSales} sale(s) and {report.costs.unknownCostParts} repair job(s), so profit is overstated by their cost. Costs are never guessed.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">Cash movement</CardTitle><CardDescription>Money in minus money out in this period. This is movement, not a balance: opening balances are not tracked.</CardDescription></CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {Object.keys(report.cash.netByMethod).length === 0 ? <li className="py-2 text-muted-foreground">No money moved.</li> : Object.entries(report.cash.netByMethod).map(([m, v]) => (
                    <Line key={m} name={label(m)} value={v} note={`in ${formatPkr(report.cash.in[m] ?? 0)} · out ${formatPkr(report.cash.out[m] ?? 0)}`} />
                  ))}
                  <Line name="Net movement" value={report.cash.netTotal} strong />
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">Owed right now</CardTitle><CardDescription>Balances today, not for the period.</CardDescription></CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  <Line name="Customers owe you" value={report.position.receivables.total} note={`sales ${formatPkr(report.position.receivables.sales)} · repairs ${formatPkr(report.position.receivables.repairs)}`} />
                  <Line name="You owe suppliers" value={report.position.payables.total} />
                  <Line name="Overdue installments" value={report.position.installments.overdueAmount} note={`${report.position.installments.overduePlans} of ${report.position.installments.activePlans} open plans`} />
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">Expenses by category</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {Object.keys(report.expenses.byCategory).length === 0 ? <li className="py-2 text-muted-foreground">No expenses.</li> : Object.entries(report.expenses.byCategory).map(([c, v]) => <Line key={c} name={label(c)} value={v} />)}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">By branch</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-muted-foreground"><th className="py-2">Branch</th><th>Revenue</th><th>Gross profit</th><th>Expenses</th><th>Net profit</th></tr></thead>
                <tbody>
                  {report.byBranch.map((b) => (
                    <tr key={b.branchId} className="border-t"><td className="py-2">{branches.find((x) => x.id === b.branchId)?.name ?? b.branchId}</td><td>{formatPkr(b.revenue)}</td><td>{formatPkr(b.grossProfit)}</td><td>{formatPkr(b.expenses)}</td><td>{formatPkr(b.netProfit)}</td></tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Customer balances</CardTitle><CardDescription>Largest first{owed?.truncated ? " (top 200 shown)" : ""}.</CardDescription></CardHeader>
            <CardContent>
              {owed?.rows.length ? (
                <ul className="divide-y text-sm">
                  {owed.rows.map((r) => (
                    <li key={`${r.type}-${r.id}`} className="flex justify-between gap-3 py-2 tabular-nums">
                      <span><Link href={r.type === "SALE" ? `/dashboard/sales/${r.id}` : `/dashboard/repairs/${r.id}`} className="underline-offset-4 hover:underline">{r.number}</Link> · {r.customerName || "Customer"} {r.customerPhone}</span>
                      <span>{formatPkr(r.dueAmount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Nobody owes you.</p>}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
