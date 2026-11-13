"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { CheckCircle2, ClipboardList, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatPrice, formatStorage } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

export function ConfirmationClient() {
  const { last: order, hydrated: storeReady } = useSelector((state) => state.orders);
  const hydrated = useHydrated() && storeReady;

  if (!hydrated) return <Skeleton className="mx-auto h-96 max-w-3xl" />;

  if (!order) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No recent order found"
        description="Place an order from your cart and its confirmation will appear here."
        href="/shop"
        actionLabel="Browse products"
      />
    );
  }

  const { totals } = order;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-full bg-accent/15 text-accent">
          <CheckCircle2 className="size-9" />
        </span>
        <h2 className="mt-5 text-3xl font-extrabold">Order received</h2>
        <p className="mt-2 text-muted-foreground">
          Reference <span className="font-display font-bold text-foreground">{order.reference}</span> &middot;{" "}
          {formatDate(order.createdAt)}
        </p>
      </div>

      <div role="note" className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          This is a demo confirmation stored on this device. The order has <span className="font-semibold text-foreground">not</span> been
          sent to the shop yet, and no payment has been taken. Real order processing arrives with the backend phase.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery to</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{order.customer.name}</p>
            <p className="text-muted-foreground">{order.address.line}</p>
            <p className="text-muted-foreground">
              {order.address.city}, {order.address.province} {order.address.postalCode}
            </p>
            <p className="text-muted-foreground">{order.customer.phone}</p>
            <p className="text-muted-foreground">{order.customer.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
            <CardDescription>{order.paymentMethod}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge variant="secondary">{order.paymentStatus}</Badge>
            <p className="text-muted-foreground">Status: {order.status}</p>
            {order.couponCode && <p className="text-muted-foreground">Coupon: {order.couponCode}</p>}
            {order.notes && <p className="text-muted-foreground">Notes: {order.notes}</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="py-2">
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((i) => (
                <TableRow key={i.key}>
                  <TableCell>
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[i.colorName, i.ram ? `${i.ram}GB RAM` : null, i.storage ? formatStorage(i.storage) : null]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">{i.qty}</TableCell>
                  <TableCell className="text-right font-semibold">{formatPrice(i.unitPrice * i.qty)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <dl className="space-y-2 border-t p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-accent">
                <dt>Discount</dt>
                <dd>- {formatPrice(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>{totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t pt-3 font-heading text-base font-bold">
              <dt>Total due on delivery</dt>
              <dd>{formatPrice(totals.total)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/shop" className={cn(buttonVariants({ size: "lg" }))}>
          Continue shopping
        </Link>
        <Link href="/" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
