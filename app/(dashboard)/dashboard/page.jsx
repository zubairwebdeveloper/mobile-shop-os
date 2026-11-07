import Link from "next/link";
import { Banknote, Boxes, CalendarClock, ShieldCheck, ShoppingCart, Store, UsersRound, Wrench } from "lucide-react";
import AuditLogTable from "@/features/platform/components/AuditLogTable";
import EmptyState from "@/components/shared/EmptyState";
import MetricCard from "@/components/shared/MetricCard";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { listShopAuditLogs } from "@/lib/tenant/audit";
import { getLowStock } from "@/lib/inventory/queries";
import { listBranches } from "@/lib/tenant/branches";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listMembers } from "@/lib/tenant/members";

export const metadata = { title: "Overview" };

// Modules that do not exist yet. They show a dash and say when they go live; nothing is invented.
const FUTURE_TILES = [
  { title: "Today's sales", icon: ShoppingCart, hint: "Live after Phase 8 (POS and sales)" },
  { title: "Gross profit", icon: Banknote, hint: "Live after Phase 10 (finance)" },
  { title: "Open repair jobs", icon: Wrench, hint: "Live after Phase 9 (repairs)" },
  { title: "Pending installments", icon: CalendarClock, hint: "Live after Phase 10" },
  { title: "Warranty alerts", icon: ShieldCheck, hint: "Live after Phase 9" },
];

export default async function DashboardOverviewPage() {
  const ctx = await getActiveTenantContext();
  const isOwner = can(ctx.role, PERMISSIONS.MEMBERS_MANAGE);
  const canAudit = can(ctx.role, PERMISSIONS.AUDIT_READ);

  const [branches, members, audit, lowStock] = await Promise.all([
    listBranches(ctx),
    isOwner ? listMembers(ctx) : Promise.resolve(null),
    canAudit ? listShopAuditLogs(ctx, { limit: 6 }) : Promise.resolve(null),
    getLowStock(ctx),
  ]);

  const activeMembers = members?.filter((m) => m.status === "ACTIVE").length;

  return (
    <>
      <PageHeader
        title={ctx.tenant.name ?? "Overview"}
        description={`Signed in as ${ctx.role.toLowerCase()}. Counts below are live; business metrics appear as their modules are built.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/dashboard/branches" className="block rounded-xl focus-visible:outline-2">
          <MetricCard
            title="Branches"
            value={ctx.allBranches ? `${ctx.tenant.counters.branches ?? branches.length} / ${ctx.tenant.limits.maxBranches ?? "—"}` : branches.length}
            hint={ctx.allBranches ? "Used of plan limit" : "Branches assigned to you"}
            icon={Store}
          />
        </Link>
        {isOwner ? (
          <Link href="/dashboard/team" className="block rounded-xl focus-visible:outline-2">
            <MetricCard
              title="Team members"
              value={`${activeMembers} / ${ctx.tenant.limits.maxEmployees ?? "—"}`}
              hint="Active, of plan limit"
              icon={UsersRound}
            />
          </Link>
        ) : null}
        <Link href="/dashboard/notifications" className="block rounded-xl focus-visible:outline-2">
          <MetricCard title="Low-stock items" value={lowStock.length} hint="At or below minimum stock" icon={Boxes} />
        </Link>
        {FUTURE_TILES.map((tile) => (
          <MetricCard key={tile.title} title={tile.title} value="—" hint={tile.hint} icon={tile.icon} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Recent activity</CardTitle>
          <CardDescription>{canAudit ? "Latest entries from your shop's audit log." : "Only the owner can see the audit log."}</CardDescription>
        </CardHeader>
        <CardContent>
          {!audit ? null : audit.entries.length === 0 ? (
            <EmptyState title="No activity yet" description="Changes to branches, settings and the team are recorded here." />
          ) : (
            <>
              <AuditLogTable entries={audit.entries} compact />
              <Link href="/dashboard/audit-logs" className="mt-3 inline-block text-sm underline underline-offset-4">
                View full audit log
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
