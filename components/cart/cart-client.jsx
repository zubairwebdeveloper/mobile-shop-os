"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CartLine } from "@/components/cart/cart-line";
import { CouponForm } from "@/components/cart/coupon-form";
import { OrderSummary } from "@/components/cart/order-summary";
import { EmptyState } from "@/components/shared/empty-state";
import { calcTotals } from "@/lib/cart/pricing";
import { clearCart } from "@/store/slices/cart-slice";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

export function CartClient() {
  const dispatch = useDispatch();
  const { items, coupon, hydrated: storeReady } = useSelector((state) => state.cart);
  const hydrated = useHydrated() && storeReady;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const totals = useMemo(() => calcTotals(items, coupon), [items, coupon]);

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]" role="status" aria-label="Loading cart">
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Looks like you have not added anything yet. Explore our latest phones and accessories."
        href="/shop"
        actionLabel="Start shopping"
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totals.itemCount} item{totals.itemCount === 1 ? "" : "s"} in your cart
          </p>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive hover:text-destructive")}>
              <Trash2 /> Clear cart
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear your cart?</DialogTitle>
                <DialogDescription>All items and any applied coupon will be removed. This cannot be undone.</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3">
                <DialogClose className={cn(buttonVariants({ variant: "outline" }))}>Cancel</DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => {
                    dispatch(clearCart());
                    setConfirmOpen(false);
                    toast("Cart cleared");
                  }}
                >
                  Yes, clear cart
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {items.map((item) => (
          <CartLine key={item.key} item={item} />
        ))}
      </div>

      <div className="space-y-5">
        <CouponForm subtotal={totals.subtotal} issue={totals.couponIssue} />
        <OrderSummary
          totals={totals}
          coupon={coupon}
          footer={
            <>
              <Link href="/checkout" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
                Proceed to checkout <ArrowRight />
              </Link>
              <Link href="/shop" className={cn(buttonVariants({ variant: "ghost" }), "w-full")}>
                Continue shopping
              </Link>
            </>
          }
        />
      </div>
    </div>
  );
}
