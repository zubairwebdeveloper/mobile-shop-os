import { notFound } from "next/navigation";
import AttendanceSheet from "@/features/hr/components/AttendanceSheet";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daySheet } from "@/lib/hr/attendance";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { isValidDateStr } from "@/lib/customers/pure";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.EMPLOYEES_READ)) notFound();
  const sp = await searchParams;
  const shop = await getShopSettings(ctx);
  const today = dayKey(new Date(), shop.timezone);
  const branches = (await listBranches(ctx)).filter((b) => b.active && (ctx.allBranches || ctx.branchIds.includes(b.id)));
  const branchId = branches.find((b) => b.id === sp.branchId)?.id ?? branches[0]?.id;
  const date = typeof sp.date === "string" && isValidDateStr(sp.date) ? sp.date : today;
  const rows = branchId ? await daySheet(ctx, { branchId, date }) : [];
  const canWrite = can(ctx.role, PERMISSIONS.EMPLOYEES_WRITE) && date <= today;

  return (
    <>
      <PageHeader title="Attendance" description="Mark who came in, branch by branch. Saving a day again corrects it." />
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">Branch
          <select name="branchId" defaultValue={branchId} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Date <Input type="date" name="date" defaultValue={date} max={today} /></label>
        <Button type="submit">Show</Button>
      </form>
      {canWrite && branchId ? <AttendanceSheet key={`${branchId}-${date}`} tenantId={ctx.tenantId} branchId={branchId} date={date} rows={rows} /> : (
        <ul className="divide-y text-sm">{rows.map((r) => <li key={r.id} className="flex justify-between py-2"><span>{r.name}</span><span>{r.status ? r.status.toLowerCase().replace(/_/g, " ") : "not marked"}</span></li>)}</ul>
      )}
    </>
  );
}
