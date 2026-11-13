"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { GitCompareArrows, Heart, ShoppingBag } from "lucide-react";
import { useSelector } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/product/product-image";
import { RatingStars } from "@/components/product/rating-stars";
import { PriceTag } from "@/components/product/price-tag";
import { useShoppingActions } from "@/hooks/use-cart-actions";
import { cn } from "@/lib/utils";
import { getBrandName } from "@/services/catalog";
import { useHydrated } from "@/hooks/use-hydrated";

function stockLabel(stock) {
  if (stock <= 0) return { text: "Out of stock", tone: "text-destructive" };
  if (stock <= 5) return { text: `Only ${stock} left`, tone: "text-amber-600 dark:text-amber-400" };
  return { text: "In stock", tone: "text-accent" };
}

export function ProductCard({ product }) {
  const reduce = useReducedMotion();
  const stock = stockLabel(product.stock);
  const { addToCart, toggleWish, toggleComparison } = useShoppingActions();
  const ready = useHydrated();
  const wishedStored = useSelector((s) => s.wishlist.ids.includes(product.id));
  const slots = useSelector((s) => s.comparison.slots);
  const wished = ready && wishedStored;
  const compared = ready && slots.includes(product.id);
  const canCompare = product.category === "smartphones";

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="h-full"
    >
      <Card className="group relative h-full gap-0 overflow-hidden py-0 transition-shadow hover:shadow-glow">
        <div className="relative">
          <Link href={`/product/${product.slug}`} aria-label={product.name} tabIndex={-1}>
            <ProductImage
              shape={product.shape}
              color={product.colors[0].hex}
              label={product.name}
              className="transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </Link>
          {product.badge && (
            <Badge className="absolute top-3 left-3" variant={product.condition === "New" ? "default" : "secondary"}>
              {product.badge}
            </Badge>
          )}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full bg-card/90 backdrop-blur"
              aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              aria-pressed={wished}
              onClick={() => toggleWish(product, wished)}
            >
              <Heart className={cn(wished && "fill-destructive text-destructive")} />
            </Button>
            {canCompare && (
              <Button
                variant="outline"
                size="icon-sm"
                className={cn("rounded-full bg-card/90 backdrop-blur", compared && "border-primary text-primary")}
                aria-label={compared ? `Remove ${product.name} from comparison` : `Compare ${product.name}`}
                aria-pressed={compared}
                onClick={() => toggleComparison(product, slots)}
              >
                <GitCompareArrows />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {getBrandName(product.brand)}
            {product.condition !== "New" && <span className="text-accent"> &middot; {product.condition}</span>}
          </p>
          <Link
            href={`/product/${product.slug}`}
            className="font-heading text-base leading-snug font-bold after:absolute after:inset-0 after:z-0 after:content-[''] hover:text-primary"
          >
            {product.name}
          </Link>
          <RatingStars rating={product.rating} count={product.reviewCount} />
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className={`text-xs font-semibold ${stock.tone}`}>{stock.text}</span>
            <Button
              size="sm"
              className="relative z-10"
              disabled={product.stock <= 0}
              onClick={() => addToCart(product)}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingBag /> Add
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
