import Link from "next/link";
import { notFound } from "next/navigation";
import { Undo2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatUtc } from "@/lib/formatters/date";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { listReturns } from "@/lib/sales/returns";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Returns" };

const label = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default async function ReturnsPage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.SALES_READ)) notFound();
  const { cursor } = await searchParams;
  const { entries, nextCursor } = await listReturns(ctx, { cursor: typeof cursor === "string" ? cursor : undefined });

  return (
    <>
      <PageHeader title="Returns" description="Refund records. To record a return, open the invoice (owner or manager)." />
      {entries.length === 0 ? (
        <EmptyState icon={Undo2} title="No returns yet" description="Returns and refunds appear here." />
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-2 pe-4 font-medium">Return</th>
                    <th scope="col" className="py-2 pe-4 font-medium">When</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Invoice</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Reason</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Refunded as</th>
                    <th scope="col" className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pe-4 font-medium">{r.number}</td>
                      <td className="whitespace-nowrap py-2 pe-4 tabular-nums text-muted-foreground">{formatUtc(r.createdAt)}</td>
                      <td className="py-2 pe-4"><Link href={`/dashboard/sales/${r.saleId}`} className="underline-offset-4 hover:underline">{r.saleNumber}</Link></td>
                      <td className="py-2 pe-4">{label(r.reason)}</td>
                      <td className="py-2 pe-4">{label(r.refundMethod)}{r.dueReduction > 0 ? <span className="block text-xs text-muted-foreground">{formatPkr(r.dueReduction)} cancelled from balance due</span> : null}</td>
                      <td className="py-2 text-right tabular-nums">{formatPkr(r.refundAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2">
              {cursor ? <Link href="/dashboard/returns" className={buttonVariants({ variant: "outline" })}>Back to newest</Link> : null}
              {nextCursor ? <Link href={`/dashboard/returns?cursor=${encodeURIComponent(nextCursor)}`} className={buttonVariants({ variant: "outline" })}>Older returns</Link> : null}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
