import Link from "next/link";
import { notFound } from "next/navigation";
import EmployeeForm from "@/features/hr/components/EmployeeForm";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { employeeMonth } from "@/lib/hr/attendance";
import { getEmployee, linkableMembers } from "@/lib/hr/employees";
import { isValidMonth, monthRange } from "@/lib/hr/pure";
import { employeeActivity, employeePerformance } from "@/lib/hr/performance";
import { formatPkr } from "@/lib/formatters/money";
import { formatUtc } from "@/lib/formatters/date";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Employee" };
export const dynamic = "force-dynamic";

const label = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default async function EmployeePage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.EMPLOYEES_READ)) notFound();
  const employee = await getEmployee(ctx, id);
  if (!employee) notFound();
  const canWrite = can(ctx.role, PERMISSIONS.EMPLOYEES_WRITE);
  const shop = await getShopSettings(ctx);
  const today = dayKey(new Date(), shop.timezone);
  const month = typeof sp.month === "string" && isValidMonth(sp.month) ? sp.month : today.slice(0, 7);
  const { from, to } = monthRange(month);

  const [att, perf, branches, linkable, activity] = await Promise.all([
    employeeMonth(ctx, employee, month),
    employeePerformance(ctx, { from, to, branchId: employee.branchId }),
    listBranches(ctx),
    canWrite ? linkableMembers(ctx) : Promise.resolve([]),
    can(ctx.role, PERMISSIONS.AUDIT_READ) ? employeeActivity(ctx, employee) : Promise.resolve(null),
  ]);
  const me = perf.rows.find((r) => r.employeeId === employee.id);
  const mine = branches.filter((b) => b.active && (ctx.allBranches || ctx.branchIds.includes(b.id))).map((b) => ({ id: b.id, name: b.name }));
  // The current account stays selectable when editing.
  const members = employee.memberUid ? [{ uid: employee.memberUid, name: "Current linked account", role: "linked" }, ...linkable] : linkable;
  const s = att.summary;

  return (
    <>
      <Link href="/dashboard/employees" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">All employees</Link>
      <PageHeader title={employee.name} description={`${employee.designation || "Staff"} · ${employee.branchName}`} />
      <form method="get" className="mb-4 flex items-end gap-2">
        <label className="text-sm">Month <input type="month" name="month" defaultValue={month} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" /></label>
        <button type="submit" className="h-9 rounded-md border px-3 text-sm">Show</button>
      </form>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Sales in {month}</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm tabular-nums">
              {!employee.memberUid ? <p className="text-muted-foreground">Not linked to a team account, so sales cannot be credited. Link one in the form.</p> : (
                <>
                  <p>{me?.salesCount ?? 0} sales · net {formatPkr(me?.netSales ?? 0)} (after returns, without tax)</p>
                  {me?.monthlyTarget ? <p>Target {formatPkr(me.monthlyTarget)}: {me.targetPercent}%</p> : <p className="text-muted-foreground">No monthly target set.</p>}
                  <p>Commission at {employee.commissionBps / 100}%: {formatPkr(me?.commissionPreview ?? 0)} (preview; finalise it on the Commission page after the month ends)</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Attendance in {month}</CardTitle></CardHeader>
            <CardContent className="text-sm tabular-nums">
              <p>Present {s.PRESENT} · late {s.LATE} · half day {s.HALF_DAY} · absent {s.ABSENT} · leave {s.LEAVE} · not marked {s.unmarked}{s.rate === null ? "" : ` · attendance ${s.rate}%`}</p>
              <ul className="mt-3 divide-y">
                {att.records.map((r) => <li key={r.date} className="flex justify-between py-1.5"><span>{r.date}</span><span>{label(r.status)}{r.note ? ` · ${r.note}` : ""}</span></li>)}
              </ul>
            </CardContent>
          </Card>
          {activity ? (
            <Card>
              <CardHeader><CardTitle className="font-heading text-lg">Recent activity</CardTitle></CardHeader>
              <CardContent>
                {activity.length === 0 ? <p className="text-sm text-muted-foreground">No recorded activity.</p> : (
                  <ul className="divide-y text-sm">{activity.map((a) => <li key={a.id} className="flex justify-between gap-3 py-1.5"><span>{label(a.action)}</span><span className="tabular-nums text-muted-foreground">{formatUtc(a.createdAt)}</span></li>)}</ul>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
        {canWrite ? <EmployeeForm key={`${employee.id}-${employee.status}-${employee.memberUid}`} tenantId={ctx.tenantId} branches={mine} members={members} employee={employee} today={today} /> : null}
      </div>
    </>
  );
}
