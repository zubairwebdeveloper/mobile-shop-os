import { formatUtc } from "@/lib/formatters/date";
import { formatPkr } from "@/lib/formatters/money";

const METHOD = { CASH: "Cash", BANK_TRANSFER: "Bank transfer", JAZZCASH: "JazzCash", EASYPAISA: "Easypaisa", EXCHANGE_CREDIT: "Exchange credit" };

/** Printable invoice / receipt. Printing hides everything except #invoice-print. */
export default function InvoiceView({ sale, shop }) {
  return (
    <>
      <style>{`@media print { body * { visibility: hidden !important; } #invoice-print, #invoice-print * { visibility: visible !important; } #invoice-print { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 12mm; background: #fff; color: #000; } }`}</style>
      <article id="invoice-print" className="max-w-2xl rounded-xl border bg-card p-6 text-sm">
        <header className="flex flex-wrap justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="font-heading text-xl font-semibold">{shop.name}</h2>
            <p className="text-muted-foreground">{[sale.branchName, shop.address, shop.city].filter(Boolean).join(" · ")}</p>
            {shop.phone ? <p className="text-muted-foreground">{shop.phone}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{sale.number}</p>
            <p className="text-muted-foreground tabular-nums">{formatUtc(sale.createdAt)}</p>
          </div>
        </header>
        {sale.customerName ? <p className="mt-3">Customer: <span className="font-medium">{sale.customerName}</span>{sale.customerPhone ? ` · ${sale.customerPhone}` : ""}</p> : null}
        <table className="mt-3 w-full text-left">
          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th scope="col" className="py-1 pe-2 font-medium">Item</th><th scope="col" className="py-1 pe-2 text-right font-medium">Qty</th><th scope="col" className="py-1 pe-2 text-right font-medium">Price</th><th scope="col" className="py-1 text-right font-medium">Total</th></tr>
          </thead>
          <tbody className="divide-y">
            {sale.items.map((i) => (
              <tr key={i.variantId}>
                <td className="py-1.5 pe-2">
                  {i.productName}<span className="block text-xs text-muted-foreground">{i.variantLabel}</span>
                  {i.imeis.length ? <span className="block text-xs tabular-nums text-muted-foreground">IMEI: {i.imeis.join(", ")}</span> : null}
                  {i.returnedQty ? <span className="block text-xs text-destructive">Returned: {i.returnedQty}</span> : null}
                </td>
                <td className="py-1.5 pe-2 text-right tabular-nums">{i.quantity}</td>
                <td className="py-1.5 pe-2 text-right tabular-nums">{formatPkr(i.unitPrice)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatPkr(i.unitPrice * i.quantity - i.lineDiscount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 ms-auto w-64 space-y-1 tabular-nums">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPkr(sale.subtotal)}</dd></div>
          {sale.lineDiscountTotal + sale.orderDiscount > 0 ? <div className="flex justify-between"><dt>Discounts</dt><dd>- {formatPkr(sale.lineDiscountTotal + sale.orderDiscount)}</dd></div> : null}
          {sale.taxAmount > 0 ? <div className="flex justify-between"><dt>Tax ({(sale.taxBps / 100).toFixed(2)}%)</dt><dd>{formatPkr(sale.taxAmount)}</dd></div> : null}
          <div className="flex justify-between border-t pt-1 text-base font-semibold"><dt>Total</dt><dd>{formatPkr(sale.total)}</dd></div>
          {sale.payments.map((p) => (
            <div key={p.method} className="flex justify-between text-muted-foreground"><dt>{METHOD[p.method] ?? p.method}{p.reference ? ` (${p.reference})` : ""}</dt><dd>{formatPkr(p.amount)}</dd></div>
          ))}
          {sale.changeGiven > 0 ? <div className="flex justify-between text-muted-foreground"><dt>Change given</dt><dd>{formatPkr(sale.changeGiven)}</dd></div> : null}
          {sale.refundedTotal > 0 ? <div className="flex justify-between text-destructive"><dt>Refunded</dt><dd>{formatPkr(sale.refundedTotal)}</dd></div> : null}
          {sale.dueAmount > 0 ? <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd>{formatPkr(sale.dueAmount)}</dd></div> : null}
        </dl>
        {sale.note ? <p className="mt-3 text-muted-foreground">Note: {sale.note}</p> : null}
        <footer className="mt-4 border-t pt-2 text-center text-xs text-muted-foreground">Thank you for your purchase.</footer>
      </article>
    </>
  );
}
