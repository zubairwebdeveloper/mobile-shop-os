import { notFound } from "next/navigation";
import RowActions from "@/features/hr/components/RowActions";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { commissionMonth } from "@/lib/hr/commissions";
import { isValidMonth } from "@/lib/hr/pure";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Commission" };
export const dynamic = "force-dynamic";

export default async function CommissionsPage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.EMPLOYEES_READ)) notFound();
  const sp = await searchParams;
  const canWrite = can(ctx.role, PERMISSIONS.EMPLOYEES_WRITE);
  const shop = await getShopSettings(ctx);
  const current = dayKey(new Date(), shop.timezone).slice(0, 7);
  const month = typeof sp.month === "string" && isValidMonth(sp.month) ? sp.month : current;
  const data = await commissionMonth(ctx, { month });
  const api = `/api/tenants/${ctx.tenantId}/commissions`;

  return (
    <>
      <PageHeader title="Commission" description="A percentage of each person's net sales (after returns, without tax), not of profit. Finalise a month once it has ended; a finalised month does not change when later returns happen." />
      <form method="get" className="mb-4 flex items-end gap-2">
        <label className="text-sm">Month <input type="month" name="month" defaultValue={month} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" /></label>
        <Button type="submit">Show</Button>
      </form>
      <Card>
        <CardContent>
          <ul className="divide-y text-sm">
            {data.rows.length === 0 ? <li className="py-3 text-muted-foreground">No employees.</li> : data.rows.map((r) => (
              <li key={r.employeeId} className="flex flex-wrap items-center justify-between gap-2 py-3 tabular-nums">
                <span><span className="font-medium">{r.name}</span> · {r.commissionBps / 100}%
                  <span className="block text-xs text-muted-foreground">{r.record ? `${r.record.salesCount} sales · net ${formatPkr(r.record.netSales)} (finalised)` : `${r.salesCount} sales · net ${formatPkr(r.netSales)}`}{!r.linked ? " · not linked to a team account" : ""}</span></span>
                <span className="flex items-center gap-2">
                  {formatPkr(r.record ? r.record.amount : r.commissionPreview)}
                  {r.record ? <StatusBadge status={r.record.status === "PAID" ? "Paid" : "Approved"} tone={r.record.status === "PAID" ? "success" : "info"} /> : <StatusBadge status="Preview" tone="neutral" />}
                  {canWrite && !r.record && month < current && r.linked ? <RowActions actions={[{ label: "Finalise", method: "POST", url: api, body: { action: "FINALIZE", employeeId: r.employeeId, month }, variant: "default" }]} /> : null}
                  {canWrite && r.record?.status === "APPROVED" ? <RowActions actions={[{ label: "Mark paid", method: "POST", url: api, body: { action: "MARK_PAID", employeeId: r.employeeId, month } }]} /> : null}
                </span>
              </li>
            ))}
          </ul>
          {data.unlinked.salesCount > 0 ? <p className="mt-3 text-xs text-muted-foreground">{data.unlinked.salesCount} sale(s) worth {formatPkr(data.unlinked.netSales)} were rung up by accounts that are not linked to an employee, so no commission is calculated for them.</p> : null}
          <p className="mt-3 text-xs text-muted-foreground">"Mark paid" only changes the status. Record the money you hand over as an expense (Salary) under Expenses.</p>
        </CardContent>
      </Card>
    </>
  );
}
