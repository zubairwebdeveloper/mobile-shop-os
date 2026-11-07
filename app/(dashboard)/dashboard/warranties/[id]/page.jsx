import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/features/sales/components/PrintButton";
import WarrantyClaims from "@/features/crm/components/WarrantyClaims";
import StatusBadge from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { getShopSettings } from "@/lib/tenant/settings";
import { getWarranty } from "@/lib/warranty/warranty";

export const metadata = { title: "Warranty" };
export const dynamic = "force-dynamic";

const TONE = { ACTIVE: "success", EXPIRED: "neutral", VOIDED: "danger" };

export default async function WarrantyPage({ params }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.CUSTOMERS_READ)) notFound();
  const warranty = await getWarranty(ctx, id);
  if (!warranty) notFound();
  const shop = await getShopSettings(ctx);
  const repairHref = `/dashboard/repairs?warrantyId=${warranty.id}`;

  return (
    <>
      <style>{`@media print { body * { visibility: hidden !important; } #certificate-print, #certificate-print * { visibility: visible !important; } #certificate-print { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 12mm; background: #fff; color: #000; } }`}</style>
      <Link href="/dashboard/warranties" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline print:hidden">All warranties</Link>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <PrintButton label="Print certificate" />
        {warranty.state === "ACTIVE" && can(ctx.role, PERMISSIONS.REPAIRS_WRITE) ? <Link href={repairHref} className={buttonVariants({ variant: "outline" })}>Start warranty repair</Link> : null}
      </div>
      <article id="certificate-print" className="mb-6 max-w-2xl rounded-xl border bg-card p-6 text-sm">
        <header className="border-b pb-3 text-center">
          <h2 className="font-heading text-xl font-semibold">{shop.name}</h2>
          <p className="text-muted-foreground">{[shop.address, shop.city, shop.phone].filter(Boolean).join(" · ")}</p>
          <p className="mt-2 text-lg font-semibold">Warranty certificate · {warranty.number}</p>
        </header>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Product</dt><dd className="font-medium">{warranty.productName} ({warranty.variantLabel})</dd></div>
          {warranty.imei1 ? <div><dt className="text-muted-foreground">IMEI</dt><dd className="font-medium tabular-nums">{warranty.imei1}</dd></div> : <div><dt className="text-muted-foreground">Quantity</dt><dd className="font-medium">{warranty.quantity}</dd></div>}
          <div><dt className="text-muted-foreground">Customer</dt><dd className="font-medium">{warranty.customerName || "Walk-in"}{warranty.customerPhone ? ` · ${warranty.customerPhone}` : ""}</dd></div>
          <div><dt className="text-muted-foreground">Invoice</dt><dd className="font-medium">{warranty.saleNumber}</dd></div>
          <div><dt className="text-muted-foreground">Starts</dt><dd className="font-medium tabular-nums">{warranty.startDate}</dd></div>
          <div><dt className="text-muted-foreground">Ends (inclusive)</dt><dd className="font-medium tabular-nums">{warranty.expiryDate} ({warranty.months} months)</dd></div>
        </dl>
        <p className="mt-3 print:hidden"><StatusBadge status={warranty.state.charAt(0) + warranty.state.slice(1).toLowerCase()} tone={TONE[warranty.state] ?? "neutral"} />{warranty.state === "ACTIVE" ? ` ${warranty.daysLeft} day(s) left` : ""}{warranty.voidReason ? ` · ${warranty.voidReason}` : ""}</p>
        {warranty.terms ? <p className="mt-3 whitespace-pre-line"><span className="text-muted-foreground">Terms: </span>{warranty.terms}</p> : null}
        {warranty.state === "VOIDED" ? <p className="mt-3 font-semibold">VOID</p> : null}
      </article>
      <WarrantyClaims tenantId={ctx.tenantId} warranty={warranty} canLog={can(ctx.role, PERMISSIONS.CUSTOMERS_WRITE)} canDecide={can(ctx.role, PERMISSIONS.SALES_REFUND_APPROVE)} />
    </>
  );
}
