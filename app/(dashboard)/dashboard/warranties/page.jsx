import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { expiringWarranties, listWarranties, lookupWarranties } from "@/lib/warranty/warranty";

export const metadata = { title: "Warranties" };
export const dynamic = "force-dynamic";

const TONE = { ACTIVE: "success", EXPIRED: "neutral", VOIDED: "danger" };
const label = (s) => String(s).toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export default async function WarrantiesPage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.CUSTOMERS_READ)) notFound();
  const sp = await searchParams;
  const lookup = typeof sp.lookup === "string" ? sp.lookup.slice(0, 40) : "";
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const expiring = sp.view === "expiring";

  let rows;
  let nextCursor = null;
  if (lookup) rows = await lookupWarranties(ctx, lookup);
  else if (expiring) rows = await expiringWarranties(ctx, 30);
  else ({ entries: rows, nextCursor } = await listWarranties(ctx, { cursor }));

  return (
    <>
      <PageHeader title="Warranties" description="Look up by IMEI or customer phone. To register a warranty, open the invoice." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex gap-2" action="/dashboard/warranties">
          <input name="lookup" defaultValue={lookup} placeholder="IMEI or phone" aria-label="Look up a warranty" className="h-10 w-64 rounded-md border border-input bg-transparent px-3 text-sm" />
          <button type="submit" className={buttonVariants({ variant: "outline" })}>Look up</button>
        </form>
        <Link href="/dashboard/warranties" className={buttonVariants({ variant: !expiring && !lookup ? "default" : "outline" })}>All</Link>
        <Link href="/dashboard/warranties?view=expiring" className={buttonVariants({ variant: expiring ? "default" : "outline" })}>Ending in 30 days</Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={lookup ? "No warranty found" : expiring ? "Nothing ending soon" : "No warranties yet"} description="Warranties are registered from an invoice." />
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-2 pe-4 font-medium">Warranty</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Product</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Customer</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Ends</th>
                    <th scope="col" className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((w) => (
                    <tr key={w.id}>
                      <td className="py-2 pe-4"><Link href={`/dashboard/warranties/${w.id}`} className="font-medium underline-offset-4 hover:underline">{w.number}</Link></td>
                      <td className="py-2 pe-4">{w.productName}<span className="block text-xs tabular-nums text-muted-foreground">{w.imei1 || w.variantLabel}</span></td>
                      <td className="py-2 pe-4">{w.customerName || "Walk-in"}</td>
                      <td className="py-2 pe-4 tabular-nums">{w.expiryDate}{w.state === "ACTIVE" ? <span className="block text-xs text-muted-foreground">{w.daysLeft} day(s) left</span> : null}</td>
                      <td className="py-2"><StatusBadge status={label(w.state)} tone={TONE[w.state] ?? "neutral"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2">
              {cursor ? <Link href="/dashboard/warranties" className={buttonVariants({ variant: "outline" })}>Back to newest</Link> : null}
              {nextCursor ? <Link href={`/dashboard/warranties?cursor=${encodeURIComponent(nextCursor)}`} className={buttonVariants({ variant: "outline" })}>Older warranties</Link> : null}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
