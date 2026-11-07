import { notFound } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { branchAnalytics, employeePerformance } from "@/lib/hr/performance";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { getShopSettings } from "@/lib/tenant/settings";
import { performanceSchema } from "@/lib/validations/hr";

export const metadata = { title: "Performance" };
export const dynamic = "force-dynamic";

export default async function PerformancePage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.EMPLOYEES_READ)) notFound();
  const sp = await searchParams;
  const shop = await getShopSettings(ctx);
  const today = dayKey(new Date(), shop.timezone);
  const parsed = performanceSchema.safeParse({ from: sp.from ?? `${today.slice(0, 7)}-01`, to: sp.to ?? today, branchId: sp.branchId || undefined });
  const branches = (await listBranches(ctx)).filter((b) => ctx.allBranches || ctx.branchIds.includes(b.id));
  let staff = null;
  let branch = null;
  let error = null;
  if (parsed.success) {
    try {
      [staff, branch] = await Promise.all([employeePerformance(ctx, parsed.data), branchAnalytics(ctx, parsed.data)]);
    } catch (e) {
      error = e?.message ?? "The report could not be built.";
    }
  } else error = parsed.error.issues[0]?.message ?? "Check the dates.";

  return (
    <>
      <PageHeader title="Performance" description="Net sales (after returns, without tax) by branch and by person. Profit is on the Finance page." />
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
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
      {branch ? (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">By branch</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-muted-foreground"><th className="py-2">Branch</th><th>Sales</th><th>Net sales</th><th>Average sale</th><th>Returns</th><th>Repairs done</th><th>Attendance</th></tr></thead>
                <tbody>
                  {branch.rows.length === 0 ? <tr><td className="py-2 text-muted-foreground" colSpan={7}>No activity in this period.</td></tr> : branch.rows.map((b) => (
                    <tr key={b.branchId} className="border-t"><td className="py-2">{b.branchName}</td><td>{b.salesCount}</td><td>{formatPkr(b.netSales)}</td><td>{formatPkr(b.averageSale)}</td><td>{b.returnsCount} ({formatPkr(b.refundTotal)})</td><td>{b.repairsDelivered}</td><td>{b.attendanceRate === null ? "—" : `${b.attendanceRate}%`}</td></tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">By person</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead><tr className="text-left text-muted-foreground"><th className="py-2">Name</th><th>Sales</th><th>Net sales</th>{staff.period.isFullMonth ? <th>Target</th> : null}</tr></thead>
                <tbody>
                  {staff.rows.map((r) => (
                    <tr key={r.employeeId} className="border-t"><td className="py-2">{r.name}{!r.linked ? " (not linked)" : ""}</td><td>{r.salesCount}</td><td>{formatPkr(r.netSales)}</td>{staff.period.isFullMonth ? <td>{r.targetPercent === null ? "—" : `${r.targetPercent}%`}</td> : null}</tr>
                  ))}
                  {staff.unlinked.salesCount > 0 ? <tr className="border-t text-muted-foreground"><td className="py-2">Accounts not linked to an employee</td><td>{staff.unlinked.salesCount}</td><td>{formatPkr(staff.unlinked.netSales)}</td>{staff.period.isFullMonth ? <td /> : null}</tr> : null}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">Sales are credited to the person who rang them up. Returns are charged back to the original sale. Targets show only when the period is exactly one calendar month.</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
