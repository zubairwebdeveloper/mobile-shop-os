"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import {
  GitCompareArrows,
  Heart,
  Minus,
  Plus,
  RotateCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { useShoppingActions } from "@/hooks/use-cart-actions";
import { useHydrated } from "@/hooks/use-hydrated";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ProductImage } from "@/components/product/product-image";
import { PriceTag } from "@/components/product/price-tag";
import { RatingStars } from "@/components/product/rating-stars";
import { ProductDetailsTabs } from "@/components/product/ProductDetailsTabs";

import { formatStorage } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

import { getBrandName, getReviews, variantPrice } from "@/services/catalog";

const VIEWS = [
  { id: "front", label: "Front view" },
  { id: "back", label: "Back view" },
  { id: "side", label: "Side view" },
];

const DEFAULT_COLOR = {
  name: "Default",
  hex: "#9CA3AF",
};

function OptionGroup({
  legend,
  options = [],
  value,
  onChange,
  format = (value) => value,
}) {
  if (!options.length) return null;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">{legend}</legend>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative h-10 overflow-hidden rounded-xl border px-4 text-sm font-semibold",
                "transition-all duration-300",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5",
              )}
            >
              {format(option.value)}

              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProductDetail({ product }) {
  const [colorIndex, setColorIndex] = useState(0);
  const [ram, setRam] = useState(product.ramOptions?.[0]?.value ?? null);
  const [storage, setStorage] = useState(
    product.storageOptions?.[0]?.value ?? null,
  );
  const [view, setView] = useState("front");
  const [zoom, setZoom] = useState(null);
  const [qty, setQty] = useState(1);

  const { addToCart, toggleWish, toggleComparison } = useShoppingActions();

  const ready = useHydrated();

  const wishedStored = useSelector(
    (state) => state.wishlist?.ids?.includes(product.id) ?? false,
  );

  const slots = useSelector((state) => state.comparison?.slots ?? []);

  const wished = ready && wishedStored;
  const compared = ready && slots.includes(product.id);

  const stock = Math.max(0, Number(product.stock) || 0);

  const maxQty = Math.max(1, Math.min(stock, 10));

  const colors = product.colors?.length ? product.colors : [DEFAULT_COLOR];

  const color = colors[Math.min(colorIndex, colors.length - 1)];

  const price = variantPrice(product, ram, storage);

  const reviews = getReviews();

  const stockText =
    stock <= 0
      ? "Out of stock"
      : stock <= 5
        ? `Only ${stock} left in stock`
        : "In stock";

  const handleZoom = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    setZoom({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleAddToCart = () => {
    if (stock <= 0) return;

    addToCart(
      product,
      {
        colorIndex,
        ram,
        storage,
      },
      qty,
    );
  };

  const handleWishlist = () => {
    toggleWish(product, wished);
  };

  const handleComparison = () => {
    toggleComparison(product, slots);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      {/* Product Gallery */}

      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div
          className={cn(
            "group relative overflow-hidden rounded-3xl border bg-card",
            "shadow-sm transition-all duration-500 hover:shadow-xl",
            "cursor-zoom-in",
          )}
          onMouseMove={handleZoom}
          onMouseLeave={() => setZoom(null)}
        >
          <div
            className="transition-transform duration-300 ease-out"
            style={{
              transform: zoom ? "scale(1.7)" : "scale(1)",
              transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center",
            }}
          >
            <ProductImage
              shape={product.shape}
              color={color.hex}
              view={view}
              label={`${product.name} ${view} view`}
              className="aspect-[5/6]"
            />
          </div>

          {product.badge && (
            <Badge className="absolute left-4 top-4 z-10 rounded-full px-3 py-1 shadow-md">
              {product.badge}
            </Badge>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/50 to-transparent px-5 pb-4 pt-12">
            <span className="text-xs font-medium text-white">{color.name}</span>

            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              Hover to zoom
            </span>
          </div>
        </div>

        {/* Product Views */}

        <div
          className="mt-4 grid grid-cols-3 gap-3"
          role="group"
          aria-label="Product views"
        >
          {VIEWS.map((item) => {
            const active = view === item.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                aria-label={item.label}
                onClick={() => setView(item.id)}
                className={cn(
                  "group overflow-hidden rounded-2xl border-2 bg-card",
                  "transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-md",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active
                    ? "border-primary shadow-md"
                    : "border-transparent hover:border-primary/40",
                )}
              >
                <ProductImage
                  shape={product.shape}
                  color={color.hex}
                  view={item.id}
                  label={item.label}
                  className="aspect-square transition-transform duration-500 group-hover:scale-105"
                />

                <span
                  className={cn(
                    "block border-t px-2 py-2 text-center text-xs font-semibold",
                    active
                      ? "border-primary/20 bg-primary/5 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Information */}

      <div className="min-w-0 space-y-7">
        {/* Product Heading */}

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
            {getBrandName(product.brand)}{" "}
            <span className="mx-1 text-primary">·</span>
            {product.condition}
          </p>

          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[2.75rem]">
            {product.name}
          </h2>

          <RatingStars
            rating={product.rating}
            count={product.reviewCount}
            className="mt-2"
            size="size-4"
          />

          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {product.summary}
          </p>
        </div>

        {/* Price and Stock */}

        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Current price
              </p>

              <PriceTag
                price={price}
                compareAtPrice={
                  product.compareAtPrice
                    ? product.compareAtPrice + (price - product.basePrice)
                    : undefined
                }
                size="lg"
              />
            </div>

            <Badge
              variant={stock > 0 ? "secondary" : "destructive"}
              className="rounded-full px-3 py-1"
            >
              {stockText}
            </Badge>
          </div>
        </div>

        {/* Color Selection */}

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">
            Color:
            <span className="ml-2 font-normal text-muted-foreground">
              {color.name}
            </span>
          </legend>

          <div className="flex flex-wrap gap-3">
            {colors.map((item, index) => {
              const active = colorIndex === index;

              return (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  aria-label={`Select ${item.name} color`}
                  aria-pressed={active}
                  title={item.name}
                  onClick={() => {
                    setColorIndex(index);
                    setZoom(null);
                  }}
                  className={cn(
                    "size-10 rounded-full border-2 shadow-sm",
                    "ring-offset-2 ring-offset-background",
                    "transition-all duration-300 hover:scale-110",
                    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
                    active
                      ? "scale-110 border-background ring-2 ring-primary"
                      : "border-white ring-1 ring-border hover:ring-primary/50",
                  )}
                  style={{
                    backgroundColor: item.hex,
                  }}
                />
              );
            })}
          </div>
        </fieldset>

        {/* Storage Options */}

        <OptionGroup
          legend="Storage"
          options={product.storageOptions ?? []}
          value={storage}
          onChange={setStorage}
          format={formatStorage}
        />

        {/* RAM Options */}

        <OptionGroup
          legend="RAM"
          options={product.ramOptions ?? []}
          value={ram}
          onChange={setRam}
          format={(value) => `${value}GB`}
        />

        {/* Quantity and Actions */}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Quantity Selector */}

            <div
              className="flex h-12 items-center gap-1 rounded-xl border bg-card p-1"
              role="group"
              aria-label="Quantity"
            >
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-lg"
                aria-label="Decrease quantity"
                disabled={qty <= 1}
                onClick={() => setQty((current) => Math.max(1, current - 1))}
              >
                <Minus className="size-4" />
              </Button>

              <span
                className="min-w-8 text-center text-sm font-bold tabular-nums"
                aria-live="polite"
              >
                {qty}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-lg"
                aria-label="Increase quantity"
                disabled={qty >= maxQty || stock <= 0}
                onClick={() =>
                  setQty((current) => Math.min(maxQty, current + 1))
                }
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Add to Cart */}

            <Button
              size="lg"
              className="h-12 flex-1 gap-2 rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:flex-none sm:px-8"
              disabled={stock <= 0}
              onClick={handleAddToCart}
            >
              <ShoppingBag className="size-4" />
              Add to cart
            </Button>
          </div>

          {/* Wishlist and Compare */}

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="outline"
              aria-pressed={wished}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              onClick={handleWishlist}
              className={cn(
                "h-12 rounded-xl transition-all duration-300 hover:-translate-y-0.5",
                wished &&
                  "border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10",
              )}
            >
              <Heart
                className={cn(
                  "size-4 transition-transform duration-300",
                  wished && "fill-current scale-110",
                )}
              />
              {wished ? "Saved" : "Wishlist"}
            </Button>

            {product.category === "smartphones" ? (
              <Button
                size="lg"
                variant="outline"
                aria-pressed={compared}
                onClick={handleComparison}
                className={cn(
                  "h-12 rounded-xl transition-all duration-300 hover:-translate-y-0.5",
                  compared && "border-primary bg-primary/5 text-primary",
                )}
              >
                <GitCompareArrows className="size-4" />
                {compared ? "Comparing" : "Compare"}
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Quality assured
              </div>
            )}
          </div>
        </div>

        {/* Shopping Benefits */}

        <ul className="grid gap-3 rounded-2xl border bg-muted/20 p-4 text-xs sm:grid-cols-3 sm:text-sm">
          <li className="flex items-center gap-2.5">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            <span className="font-medium">Warranty included</span>
          </li>

          <li className="flex items-center gap-2.5">
            <Truck className="size-5 shrink-0 text-primary" />
            <span className="font-medium">Nationwide delivery</span>
          </li>

          <li className="flex items-center gap-2.5">
            <RotateCw className="size-5 shrink-0 text-primary" />
            <span className="font-medium">7-day returns</span>
          </li>
        </ul>

        {/* Product Details Tabs */}

        <ProductDetailsTabs product={product} reviews={reviews} />
      </div>
    </div>
  );
}
