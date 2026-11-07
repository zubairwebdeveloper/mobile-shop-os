import Link from "next/link";
import { notFound } from "next/navigation";
import InvoiceView from "@/features/sales/components/InvoiceView";
import PrintButton from "@/features/sales/components/PrintButton";
import RegisterWarranty from "@/features/crm/components/RegisterWarranty";
import CollectForm from "@/features/finance/components/CollectForm";
import PlanForm from "@/features/finance/components/PlanForm";
import ReturnForm from "@/features/sales/components/ReturnForm";
import { dayKey } from "@/lib/sales/pure";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getPlan } from "@/lib/finance/installments";
import { getSale } from "@/lib/sales/sales";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function SalePage({ params }) {
  const { id } = await params;
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.SALES_READ)) notFound();
  const sale = await getSale(ctx, id);
  if (!sale) notFound();
  const shop = await getShopSettings(ctx);
  const plan = await getPlan(ctx, sale.id);
  const canCollect = can(ctx.role, PERMISSIONS.SALES_CREATE) && sale.dueAmount > 0;

  return (
    <>
      <Link href="/dashboard/sales" className="mb-4 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline print:hidden">All sales</Link>
      <div className="mb-4 flex gap-2 print:hidden"><PrintButton label="Print receipt" /></div>
      <InvoiceView sale={sale} shop={shop} />
      {sale.dueAmount > 0 ? <p className="mt-4 text-sm print:hidden">Balance due on this invoice is shown above.{plan ? <> <Link href={`/dashboard/installments/${sale.id}`} className="underline-offset-4 hover:underline">Open installment plan {plan.number}</Link></> : null}</p> : null}
      {canCollect ? <div className="mt-6"><CollectForm key={`${sale.id}-c-${sale.dueAmount}`} tenantId={ctx.tenantId} targetType="SALE" targetId={sale.id} due={sale.dueAmount} /></div> : null}
      {canCollect && !plan && sale.customerId ? <div className="mt-6"><PlanForm tenantId={ctx.tenantId} saleId={sale.id} due={sale.dueAmount} today={dayKey(new Date(), shop.timezone)} /></div> : null}
      {can(ctx.role, PERMISSIONS.CUSTOMERS_WRITE) && sale.status !== "RETURNED" ? (
        <div className="mt-6">
          <RegisterWarranty key={`${sale.id}-w-${sale.refundedTotal}`} tenantId={ctx.tenantId} sale={sale} today={dayKey(new Date(), shop.timezone)} />
        </div>
      ) : null}
      {sale.customerId ? <p className="mt-4 text-sm print:hidden"><Link href={`/dashboard/customers/${sale.customerId}`} className="underline-offset-4 hover:underline">Open customer profile</Link></p> : null}
      {can(ctx.role, PERMISSIONS.SALES_REFUND_APPROVE) ? (
        <div className="mt-6">
          <ReturnForm key={`${sale.id}-${sale.refundedTotal}`} tenantId={ctx.tenantId} sale={sale} />
        </div>
      ) : null}
    </>
  );
}
