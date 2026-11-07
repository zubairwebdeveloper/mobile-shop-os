import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/features/sales/components/PrintButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPayment } from "@/lib/finance/collections";
import { formatUtc } from "@/lib/formatters/date";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.SALES_READ)) notFound();
  const p = await getPayment(ctx, id);
  if (!p) notFound();
  const shop = await getShopSettings(ctx);
  const back = p.targetType === "SALE" ? `/dashboard/sales/${p.targetId}` : `/dashboard/repairs/${p.targetId}`;

  return (
    <>
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <Link href={back} className="text-sm text-muted-foreground underline-offset-4 hover:underline">Back</Link>
        <PrintButton label="Print receipt" />
      </div>
      <Card className="max-w-md">
        <CardHeader><CardTitle className="font-heading text-lg">{shop.name ?? "Payment receipt"} · {p.number}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm tabular-nums">
          <p>{formatUtc(p.createdAt)}</p>
          <p>For {p.targetType === "SALE" ? "invoice" : "repair"} {p.targetNumber}</p>
          {p.customerName ? <p>Customer: {p.customerName} {p.customerPhone}</p> : null}
          <p className="pt-2 text-base font-semibold">Received {formatPkr(p.amount)} ({p.method.replace(/_/g, " ").toLowerCase()})</p>
          {p.reference ? <p>Reference: {p.reference}</p> : null}
          <p>Balance remaining: {formatPkr(p.balanceAfter)}</p>
          {p.allocations.length ? <p className="text-xs text-muted-foreground">Applied to installment{p.allocations.length > 1 ? "s" : ""} {p.allocations.map((a) => `#${a.no}`).join(", ")}</p> : null}
        </CardContent>
      </Card>
    </>
  );
}
