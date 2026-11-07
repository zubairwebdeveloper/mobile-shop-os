import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatUtc } from "@/lib/formatters/date";
import { listMovements } from "@/lib/inventory/queries";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";

export const metadata = { title: "Stock movements" };

const label = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default async function StockMovementsPage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  const { cursor } = await searchParams;
  const [{ entries, nextCursor }, branches] = await Promise.all([
    listMovements(ctx, { cursor: typeof cursor === "string" ? cursor : undefined }),
    listBranches(ctx),
  ]);
  const branchName = (id) => branches.find((b) => b.id === id)?.name ?? "Branch";

  return (
    <>
      <PageHeader title="Stock movements" description="Every change to stock, newest first. This history cannot be edited." />
      {entries.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No movements yet" description="Receiving, adjustments, transfers and device changes appear here." />
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-2 pe-4 font-medium">When</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Type</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Product</th>
                    <th scope="col" className="py-2 pe-4 font-medium">Branch</th>
                    <th scope="col" className="py-2 pe-4 text-right font-medium">Change</th>
                    <th scope="col" className="py-2 text-right font-medium">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap py-2 pe-4 tabular-nums text-muted-foreground">{formatUtc(m.createdAt)}</td>
                      <td className="py-2 pe-4">{label(m.type)}{m.reason ? <span className="block text-xs text-muted-foreground">{label(m.reason)}</span> : null}</td>
                      <td className="py-2 pe-4">{m.productName}<span className="block text-xs text-muted-foreground">{m.variantLabel}</span></td>
                      <td className="py-2 pe-4">{branchName(m.branchId)}</td>
                      <td className={`py-2 pe-4 text-right tabular-nums ${m.quantityChange < 0 ? "text-destructive" : ""}`}>{m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}</td>
                      <td className="py-2 text-right tabular-nums">{m.quantityAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-2">
              {cursor ? <Link href="/dashboard/stock-movements" className={buttonVariants({ variant: "outline" })}>Back to newest</Link> : null}
              {nextCursor ? <Link href={`/dashboard/stock-movements?cursor=${encodeURIComponent(nextCursor)}`} className={buttonVariants({ variant: "outline" })}>Older entries</Link> : null}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
