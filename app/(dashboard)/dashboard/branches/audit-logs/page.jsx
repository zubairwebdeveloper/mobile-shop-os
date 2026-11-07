import Link from "next/link";
import { ScrollText } from "lucide-react";
import AuditLogTable from "@/features/platform/components/AuditLogTable";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listShopAuditLogs } from "@/lib/tenant/audit";

export const metadata = { title: "Audit logs" };

export default async function ShopAuditLogsPage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.AUDIT_READ)) {
    return (
      <>
        <PageHeader title="Audit logs" />
        <EmptyState icon={ScrollText} title="Owner only" description="Only the shop owner can view the audit log." />
      </>
    );
  }

  const { cursor } = await searchParams;
  const { entries, nextCursor } = await listShopAuditLogs(ctx, { limit: 50, cursor: typeof cursor === "string" ? cursor : undefined });

  return (
    <>
      <PageHeader title="Audit logs" description="Who changed what, newest first. Entries cannot be edited or deleted from the app." />
      {entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No entries" description="Nothing has been recorded yet." />
      ) : (
        <Card>
          <CardContent>
            <AuditLogTable entries={entries} />
            <div className="mt-4 flex gap-2">
              {cursor ? (
                <Link href="/dashboard/audit-logs" className={buttonVariants({ variant: "outline" })}>
                  Back to newest
                </Link>
              ) : null}
              {nextCursor ? (
                <Link href={`/dashboard/audit-logs?cursor=${encodeURIComponent(nextCursor)}`} className={buttonVariants({ variant: "outline" })}>
                  Older entries
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
