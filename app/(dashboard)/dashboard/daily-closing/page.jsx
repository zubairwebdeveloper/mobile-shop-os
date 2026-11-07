import { notFound } from "next/navigation";
import ClosingForm from "@/features/sales/components/ClosingForm";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { listClosings } from "@/lib/sales/closing";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Daily closing" };

export default async function DailyClosingPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.SALES_READ)) notFound();
  const [{ entries }, branches, shop] = await Promise.all([listClosings(ctx, {}), listBranches(ctx), getShopSettings(ctx)]);
  const canClose = can(ctx.role, PERMISSIONS.SALES_CREATE);

  return (
    <>
      <PageHeader title="Daily closing" description={`Cash drawer reconciliation. Days follow the shop timezone (${shop.timezone}).`} />
      <div className="grid gap-6 lg:grid-cols-2">
        {canClose ? <ClosingForm tenantId={ctx.tenantId} branches={branches.filter((b) => b.active)} today={dayKey(new Date(), shop.timezone)} /> : null}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Past closings</CardTitle>
            <CardDescription>Newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? <p className="text-sm text-muted-foreground">No closings yet.</p> : (
              <ul className="divide-y text-sm">
                {entries.map((c) => (
                  <li key={c.id} className="py-3">
                    <p className="font-medium">{c.date} · {c.branchName}</p>
                    <p className="tabular-nums text-muted-foreground">
                      {c.salesCount} sales · {formatPkr(c.salesTotal)} · refunds {formatPkr(c.refundTotal)}
                    </p>
                    <p className="tabular-nums">
                      Expected {formatPkr(c.expectedCash)} · counted {formatPkr(c.countedCash)} ·{" "}
                      <span className={c.difference === 0 ? "" : "font-medium text-destructive"}>{c.difference === 0 ? "balanced" : `difference ${c.difference > 0 ? "+" : "-"}${formatPkr(Math.abs(c.difference))}`}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
