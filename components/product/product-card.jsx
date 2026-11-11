"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/product/product-image";
import { RatingStars } from "@/components/product/rating-stars";
import { PriceTag } from "@/components/product/price-tag";
import { getBrandName } from "@/services/catalog";

function stockLabel(stock) {
  if (stock <= 0) return { text: "Out of stock", tone: "text-destructive" };
  if (stock <= 5) return { text: `Only ${stock} left`, tone: "text-amber-600 dark:text-amber-400" };
  return { text: "In stock", tone: "text-accent" };
}

export function ProductCard({ product }) {
  const reduce = useReducedMotion();
  const stock = stockLabel(product.stock);

  // Cart & wishlist state aa'ega Phase 03 mein; ab honest feedback dete hain.
  const notReady = (what) => toast.info(`${what} will be enabled in the shopping-system phase.`);

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
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-3 z-10 rounded-full bg-card/90 backdrop-blur"
            aria-label={`Add ${product.name} to wishlist`}
            onClick={() => notReady("Wishlist")}
          >
            <Heart />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {getBrandName(product.brand)}
            {product.condition !== "New" && <span className="text-accent"> &middot; {product.condition}</span>}
          </p>
          <Link
            href={`/product/${product.slug}`}
            className="font-heading text-base leading-snug font-bold after:absolute after:inset-0 after:content-[''] after:z-0 hover:text-primary"
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
              onClick={() => notReady("Add to cart")}
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
