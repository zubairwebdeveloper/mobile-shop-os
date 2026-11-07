import { notFound } from "next/navigation";
import LeaveForm from "@/features/hr/components/LeaveForm";
import RowActions from "@/features/hr/components/RowActions";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { listEmployees } from "@/lib/hr/employees";
import { listLeaves } from "@/lib/hr/leave";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Leave" };
export const dynamic = "force-dynamic";

const TONE = { PENDING: "warning", APPROVED: "success", REJECTED: "danger", CANCELLED: "neutral" };

export default async function LeavePage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.EMPLOYEES_READ)) notFound();
  const canWrite = can(ctx.role, PERMISSIONS.EMPLOYEES_WRITE);
  const shop = await getShopSettings(ctx);
  const [leaves, employees] = await Promise.all([listLeaves(ctx), listEmployees(ctx, { activeOnly: true })]);
  const url = (id) => `/api/tenants/${ctx.tenantId}/leave/${id}`;

  return (
    <>
      <PageHeader title="Leave" description="Requests newest first. Approved leave shows as leave in attendance on days without a mark." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Leave requests">
          {leaves.length === 0 ? <EmptyState title="No leave requests" description="Add one on the right." /> : (
            <Card>
              <CardContent>
                <ul className="divide-y text-sm">
                  {leaves.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <span><span className="font-medium">{l.employeeName}</span> · {l.type.toLowerCase()}
                        <span className="block text-xs text-muted-foreground tabular-nums">{l.from} to {l.to} ({l.days} day{l.days === 1 ? "" : "s"}){l.reason ? ` · ${l.reason}` : ""}</span></span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={l.status.toLowerCase()} tone={TONE[l.status]} />
                        {canWrite && l.status === "PENDING" ? <RowActions actions={[{ label: "Approve", method: "PATCH", url: url(l.id), body: { decision: "APPROVED" } }, { label: "Reject", method: "PATCH", url: url(l.id), body: { decision: "REJECTED" } }]} /> : null}
                        {canWrite && l.status === "APPROVED" ? <RowActions actions={[{ label: "Cancel", method: "PATCH", url: url(l.id), body: { decision: "CANCELLED" } }]} /> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>
        {canWrite && employees.length > 0 ? <LeaveForm tenantId={ctx.tenantId} employees={employees} today={dayKey(new Date(), shop.timezone)} /> : null}
      </div>
    </>
  );
}
