"use client";

import Link from "next/link";
import { useDispatch } from "react-redux";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/product/product-image";
import { removeItem, setQty } from "@/store/slices/cart-slice";
import { formatPrice, formatStorage } from "@/lib/utils/format";
import { getBrandName } from "@/services/catalog";

export function CartLine({ item }) {
  const dispatch = useDispatch();
  const variant = [item.colorName, item.ram ? `${item.ram}GB RAM` : null, item.storage ? formatStorage(item.storage) : null]
    .filter(Boolean)
    .join(" / ");
  const atMax = item.qty >= item.maxStock;

  return (
    <Card className="flex-row items-center gap-4 p-4 sm:gap-6 sm:p-5">
      <Link href={`/product/${item.slug}`} className="w-24 shrink-0 sm:w-28" aria-label={item.name}>
        <ProductImage shape={item.shape} color={item.colorHex} label={item.name} className="rounded-xl" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{getBrandName(item.brand)}</p>
          <Link href={`/product/${item.slug}`} className="block font-heading font-bold hover:text-primary">
            {item.name}
          </Link>
          <p className="text-xs text-muted-foreground">{variant}</p>
          <p className="text-sm font-semibold">{formatPrice(item.unitPrice)}</p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="flex items-center gap-1 rounded-lg border bg-card" role="group" aria-label={`Quantity for ${item.name}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Decrease quantity"
              disabled={item.qty <= 1}
              onClick={() => dispatch(setQty({ key: item.key, qty: item.qty - 1 }))}
            >
              <Minus />
            </Button>
            <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">
              {item.qty}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Increase quantity"
              onClick={() => {
                if (atMax) toast.info(`Only ${item.maxStock} available for this item`);
                else dispatch(setQty({ key: item.key, qty: item.qty + 1 }));
              }}
            >
              <Plus />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold">{formatPrice(item.unitPrice * item.qty)}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${item.name}`}
              onClick={() => {
                dispatch(removeItem(item.key));
                toast("Item removed from cart");
              }}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
