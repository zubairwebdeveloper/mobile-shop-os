import Link from "next/link";
import { notFound } from "next/navigation";
import { UserCog } from "lucide-react";
import EmployeeForm from "@/features/hr/components/EmployeeForm";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listEmployees, linkableMembers } from "@/lib/hr/employees";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Employees" };
export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.EMPLOYEES_READ)) notFound();
  const canWrite = can(ctx.role, PERMISSIONS.EMPLOYEES_WRITE);
  const [employees, branches, shop, members] = await Promise.all([
    listEmployees(ctx), listBranches(ctx), getShopSettings(ctx), canWrite ? linkableMembers(ctx) : Promise.resolve([]),
  ]);
  const mine = branches.filter((b) => b.active && (ctx.allBranches || ctx.branchIds.includes(b.id))).map((b) => ({ id: b.id, name: b.name }));

  return (
    <>
      <PageHeader title="Employees" description="Staff records for your branches: attendance, leave, targets and commission." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/dashboard/attendance" className={buttonVariants({ variant: "outline" })}>Attendance</Link>
        <Link href="/dashboard/leave" className={buttonVariants({ variant: "outline" })}>Leave</Link>
        <Link href="/dashboard/commissions" className={buttonVariants({ variant: "outline" })}>Commission</Link>
        <Link href="/dashboard/performance" className={buttonVariants({ variant: "outline" })}>Performance</Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Employees">
          {employees.length === 0 ? (
            <EmptyState icon={UserCog} title="No employees yet" description="Add the first one on the right." />
          ) : (
            <Card>
              <CardContent>
                <ul className="divide-y text-sm">
                  {employees.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <span>
                        <Link href={`/dashboard/employees/${e.id}`} className="font-medium underline-offset-4 hover:underline">{e.name}</Link>
                        <span className="block text-xs text-muted-foreground">{e.designation || "Staff"} · {e.branchName} · {e.memberUid ? "linked to a team account" : "not linked"}</span>
                      </span>
                      <StatusBadge status={e.status === "ACTIVE" ? "Active" : "Inactive"} tone={e.status === "ACTIVE" ? "success" : "neutral"} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>
        {canWrite ? <EmployeeForm tenantId={ctx.tenantId} branches={mine} members={members} today={dayKey(new Date(), shop.timezone)} /> : null}
      </div>
    </>
  );
}
