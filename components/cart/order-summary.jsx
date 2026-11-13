import { Truck } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils/format";

export function OrderSummary({ totals, coupon, title = "Order summary", children, footer }) {
  return (
    <Card className="h-fit lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal ({totals.itemCount} items)</dt>
            <dd className="font-semibold">{formatPrice(totals.subtotal)}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-accent">
              <dt>Discount{coupon ? ` (${coupon.code})` : ""}</dt>
              <dd className="font-semibold">- {formatPrice(totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="font-semibold">{totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}</dd>
          </div>
        </dl>

        {totals.shipping > 0 && totals.amountToFreeShipping > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <Truck className="mt-0.5 size-4 shrink-0 text-accent" />
            Add {formatPrice(totals.amountToFreeShipping)} more for free delivery.
          </p>
        )}

        <Separator />
        <div className="flex items-baseline justify-between">
          <span className="font-heading font-bold">Total</span>
          <span className="font-display text-2xl font-bold">{formatPrice(totals.total)}</span>
        </div>
        {children}
      </CardContent>
      {footer && <CardFooter className="flex-col items-stretch gap-3">{footer}</CardFooter>}
    </Card>
  );
}
