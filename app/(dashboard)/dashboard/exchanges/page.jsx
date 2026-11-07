import Link from "next/link";
import { notFound } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatUtc } from "@/lib/formatters/date";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { listExchangeCredits } from "@/lib/sales/returns";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Exchanges" };

export default async function ExchangesPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.SALES_CREATE)) notFound();
  const credits = await listExchangeCredits(ctx);

  return (
    <>
      <PageHeader
        title="Exchanges"
        description="An exchange is a return refunded as exchange credit, then spent as a payment on a new sale in the POS."
        actions={<Link href="/dashboard/pos" className={buttonVariants({ variant: "outline" })}>Open POS</Link>}
      />
      {credits.length === 0 ? (
        <EmptyState icon={RefreshCcw} title="No open exchange credit" description="Record a return with 'Exchange credit' to create one." />
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y text-sm">
              {credits.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>{c.returnNumber} <span className="text-muted-foreground">from {c.saleNumber} · {formatUtc(c.createdAt)}</span></span>
                  <span className="font-medium tabular-nums">{formatPkr(c.remaining)} left of {formatPkr(c.creditAmount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
