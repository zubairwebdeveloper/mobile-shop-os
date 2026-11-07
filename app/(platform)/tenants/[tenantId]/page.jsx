import Link from "next/link";
import { notFound } from "next/navigation";
import AuditLogTable from "@/features/platform/components/AuditLogTable";
import SubscriptionForm from "@/features/platform/components/SubscriptionForm";
import TenantStatusPanel from "@/features/platform/components/TenantStatusPanel";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUtc, formatUtcDate } from "@/lib/formatters/date";
import { listPlans } from "@/lib/platform/plans";
import { getTenantDetail } from "@/lib/platform/tenants";
import { requirePlatformAdmin } from "@/lib/tenant/context";


export async function generateMetadata({ params }) {
  const { tenantId } = await params;
  const tenant = await getTenantDetail(tenantId).catch(() => null);
  return { title: tenant?.name ?? "Shop" };
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{children || "—"}</dd>
    </div>
  );
}

export default async function PlatformTenantPage({ params }) {
  await requirePlatformAdmin();
  const { tenantId } = await params;
  const [tenant, plans] = await Promise.all([getTenantDetail(tenantId), listPlans()]);
  if (!tenant) notFound();

  const maxBranches = tenant.limits.maxBranches;

  return (
    <>
      <Link href="/platform/tenants" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">
        All shops
      </Link>
      <PageHeader
        title={tenant.name}
        description={`Shop address: ${tenant.slug} · created ${formatUtcDate(tenant.createdAt)}`}
        actions={<StatusBadge status={tenant.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Row label="Owner">{tenant.owner.name}</Row>
              <Row label="Owner email">{tenant.owner.email}</Row>
              <Row label="Phone">{tenant.profile.phone}</Row>
              <Row label="City">{tenant.profile.city}</Row>
              <Row label="Address">{tenant.profile.address}</Row>
              <Row label="Currency / timezone">{[tenant.settings.currency, tenant.settings.timezone].filter(Boolean).join(" · ")}</Row>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Usage</CardTitle>
            <CardDescription>Measured from the shop&apos;s own counters.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Row label="Branches">
                {tenant.counters.branches ?? 0} of {maxBranches ?? "—"}
              </Row>
              <Row label="Active team members">{tenant.activeMembers}</Row>
              <Row label="Plan">{tenant.planId}</Row>
              <Row label="Subscription">
                {tenant.subscription.status
                  ? `${tenant.subscription.status.toLowerCase().replace("_", " ")}${tenant.subscription.renewsAt ? ` · renews ${formatUtcDate(tenant.subscription.renewsAt)}` : ""}`
                  : "Not set"}
              </Row>
            </dl>
          </CardContent>
        </Card>

        <SubscriptionForm
          tenantId={tenant.id}
          currentPlanId={tenant.planId}
          currentStatus={tenant.subscription.status}
          currentRenewsAt={tenant.subscription.renewsAt}
          plans={plans}
        />
        <TenantStatusPanel tenantId={tenant.id} status={tenant.status} suspension={tenant.suspension} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Recent activity</CardTitle>
          <CardDescription>Latest entries from this shop&apos;s audit log (times in UTC: {formatUtc(new Date().toISOString())}).</CardDescription>
        </CardHeader>
        <CardContent>
          {tenant.recentAudit.length === 0 ? (
            <EmptyState title="No activity" description="Nothing has been recorded for this shop yet." />
          ) : (
            <AuditLogTable entries={tenant.recentAudit} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
