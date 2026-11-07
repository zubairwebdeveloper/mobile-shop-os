import Link from "next/link";
import { notFound } from "next/navigation";
import CustomerForm from "@/features/crm/components/CustomerForm";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomer } from "@/lib/customers/customers";
import { formatUtc, formatUtcDate } from "@/lib/formatters/date";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Customer" };
export const dynamic = "force-dynamic";

const label = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Stat({ name, value }) {
  return (
    <Card><CardContent className="pt-6"><p className="text-xs uppercase tracking-wide text-muted-foreground">{name}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></CardContent></Card>
  );
}

export default async function CustomerPage({ params }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.CUSTOMERS_READ)) notFound();
  const data = await getCustomer(ctx, id);
  if (!data) notFound();
  const { customer, stats } = data;
  const canPrivate = can(ctx.role, PERMISSIONS.CUSTOMERS_PRIVATE_READ);

  return (
    <>
      <Link href="/dashboard/customers" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">All customers</Link>
      <PageHeader
        title={customer.name}
        description={`${customer.phone}${customer.city ? ` · ${customer.city}` : ""}${data.private?.email ? ` · ${data.private.email}` : ""}`}
        actions={<div className="flex gap-2">{customer.vip ? <StatusBadge status="VIP" tone="info" /> : null}{customer.status === "ARCHIVED" ? <StatusBadge status="Archived" tone="neutral" /> : null}</div>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat name="Purchases" value={stats.salesCount} />
        <Stat name="Lifetime value" value={formatPkr(stats.lifetimeValue)} />
        <Stat name="Outstanding balance" value={formatPkr(stats.outstanding)} />
        <Stat name="Last purchase" value={stats.lastPurchaseAt ? formatUtcDate(stats.lastPurchaseAt) : "None"} />
      </div>
      {data.truncated ? <p className="mb-4 text-xs text-muted-foreground">Showing the latest 200 records of each kind.</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Purchases</CardTitle><CardDescription>Only the branches you work in.</CardDescription></CardHeader>
            <CardContent>
              {data.sales.length === 0 ? <p className="text-sm text-muted-foreground">No purchases yet.</p> : (
                <ul className="divide-y text-sm">
                  {data.sales.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span><Link href={`/dashboard/sales/${s.id}`} className="font-medium underline-offset-4 hover:underline">{s.number}</Link> <span className="text-muted-foreground tabular-nums">{formatUtc(s.createdAt)}</span></span>
                      <span className="tabular-nums">{formatPkr(s.total)}{s.dueAmount > 0 ? <span className="text-destructive"> · due {formatPkr(s.dueAmount)}</span> : null}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Devices bought</CardTitle></CardHeader>
            <CardContent>
              {data.devices.length === 0 ? <p className="text-sm text-muted-foreground">No tracked devices.</p> : (
                <ul className="divide-y text-sm">
                  {data.devices.map((d) => (
                    <li key={d.imei} className="flex flex-wrap justify-between gap-2 py-2"><span>{d.productName} <span className="text-muted-foreground">({d.variantLabel})</span></span><span className="tabular-nums text-muted-foreground">{d.imei}</span></li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Warranties</CardTitle></CardHeader>
            <CardContent>
              {data.warranties.length === 0 ? <p className="text-sm text-muted-foreground">No warranties.</p> : (
                <ul className="divide-y text-sm">
                  {data.warranties.map((w) => (
                    <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link href={`/dashboard/warranties/${w.id}`} className="underline-offset-4 hover:underline">{w.productName} · {w.number}</Link>
                      <span className="tabular-nums text-muted-foreground">{label(w.state)} · ends {w.expiryDate}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Repairs</CardTitle></CardHeader>
            <CardContent>
              {data.repairs.length === 0 ? <p className="text-sm text-muted-foreground">No repair jobs.</p> : (
                <ul className="divide-y text-sm">
                  {data.repairs.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link href={`/dashboard/repairs/${r.id}`} className="underline-offset-4 hover:underline">{r.number} · {r.deviceBrand} {r.deviceModel}</Link>
                      <span className="text-muted-foreground">{label(r.status)}{r.dueAmount > 0 ? ` · due ${formatPkr(r.dueAmount)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {can(ctx.role, PERMISSIONS.CUSTOMERS_WRITE) ? <CustomerForm key={`${customer.id}-${customer.name}-${customer.phone}-${customer.vip}-${customer.status}`} tenantId={ctx.tenantId} customer={customer} privateData={data.private} canPrivate={canPrivate} /> : null}
      </div>
    </>
  );
}
