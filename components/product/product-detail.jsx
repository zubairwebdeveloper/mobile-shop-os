"use client";

import { useState } from "react";
import { Heart, RotateCw, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ProductImage } from "@/components/product/product-image";
import { PriceTag } from "@/components/product/price-tag";
import { RatingStars } from "@/components/product/rating-stars";
import { formatStorage } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { getBrandName, getReviews, variantPrice } from "@/services/catalog";

const VIEWS = [
  { id: "front", label: "Front view" },
  { id: "back", label: "Back view" },
  { id: "side", label: "Side view" },
];

function OptionGroup({ legend, options, value, onChange, format }) {
  if (options.length === 0) return null;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-10 rounded-lg border px-4 text-sm font-semibold transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              value === o.value
                ? "border-primary bg-primary/10 text-primary"
                : "bg-card hover:border-primary/40",
            )}
          >
            {format(o.value)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ProductDetail({ product }) {
  const [colorIndex, setColorIndex] = useState(0);
  const [ram, setRam] = useState(product.ramOptions[0]?.value ?? null);
  const [storage, setStorage] = useState(product.storageOptions[0]?.value ?? null);
  const [view, setView] = useState("front");
  const [zoom, setZoom] = useState(null);

  const color = product.colors[colorIndex];
  const price = variantPrice(product, ram, storage);
  const reviews = getReviews();

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const stockText =
    product.stock <= 0 ? "Out of stock" : product.stock <= 5 ? `Only ${product.stock} left in stock` : "In stock";

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      {/* Gallery */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div
          className="relative cursor-zoom-in overflow-hidden rounded-3xl border bg-card"
          onMouseMove={onMove}
          onMouseLeave={() => setZoom(null)}
        >
          <div
            className="transition-transform duration-200 ease-out"
            style={
              zoom
                ? {
                    transform: "scale(1.7)",
                    transformOrigin: `${zoom.x}% ${zoom.y}%`,
                  }
                : { transform: "scale(1)" }
            }
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
            <Badge className="absolute top-4 left-4">{product.badge}</Badge>
          )}
          <p className="pointer-events-none absolute right-4 bottom-4 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            Hover to zoom
          </p>
        </div>
        <div
          className="mt-4 grid grid-cols-3 gap-3"
          role="group"
          aria-label="Product views"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              aria-label={v.label}
              onClick={() => setView(v.id)}
              className={cn(
                "overflow-hidden rounded-xl border-2 transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                view === v.id
                  ? "border-primary"
                  : "border-transparent hover:border-border",
              )}
            >
              <ProductImage
                shape={product.shape}
                color={color.hex}
                view={v.id}
                label={v.label}
                className="aspect-square"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-7">
        <div>
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {getBrandName(product.brand)} &middot; {product.condition}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            {product.name}
          </h2>
          <RatingStars
            rating={product.rating}
            count={product.reviewCount}
            className="mt-3"
            size="size-4"
          />
          <p className="mt-4 text-muted-foreground">{product.summary}</p>
        </div>

        <div>
          <PriceTag
            price={price}
            compareAtPrice={
              product.compareAtPrice &&
              product.compareAtPrice + (price - product.basePrice)
            }
            size="lg"
          />
          <p
            className={cn(
              "mt-2 text-sm font-semibold",
              product.stock > 0 ? "text-accent" : "text-destructive",
            )}
          >
            {stockText}
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">
            Color:{" "}
            <span className="font-normal text-muted-foreground">
              {color.name}
            </span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {product.colors.map((c, i) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                aria-pressed={colorIndex === i}
                onClick={() => setColorIndex(i)}
                className={cn(
                  "size-9 rounded-full border-2 border-white shadow ring-offset-2 ring-offset-background transition-all focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none",
                  colorIndex === i
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-border hover:ring-primary/50",
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </fieldset>

        <OptionGroup
          legend="Storage"
          options={product.storageOptions}
          value={storage}
          onChange={setStorage}
          format={formatStorage}
        />
        <OptionGroup
          legend="RAM"
          options={product.ramOptions}
          value={ram}
          onChange={setRam}
          format={(v) => `${v}GB`}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            className="flex-1 sm:flex-none sm:px-10"
            disabled={product.stock <= 0}
            onClick={() =>
              toast.info("Cart will be enabled in the shopping-system phase.")
            }
          >
            <ShoppingBag /> Add to cart
          </Button>
          <Button
            size="lg"
            variant="outline"
            aria-label="Add to wishlist"
            onClick={() =>
              toast.info(
                "Wishlist will be enabled in the shopping-system phase.",
              )
            }
          >
            <Heart /> Wishlist
          </Button>
        </div>

        <ul className="grid gap-3 rounded-2xl border bg-card p-4 text-sm sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent" /> Warranty included
          </li>
          <li className="flex items-center gap-2">
            <Truck className="size-4 text-accent" /> Nationwide delivery
          </li>
          <li className="flex items-center gap-2">
            <RotateCw className="size-4 text-accent" /> 7-day returns
          </li>
        </ul>

        <Tabs
          defaultValue="specs"
          orientation="horizontal"
          className="flex w-full min-w-0 flex-col gap-4"
        >
          {/* Tabs Navigation - Always Top */}
          <div className="w-full min-w-0 overflow-x-auto scrollbar-none">
            <TabsList className="flex h-auto w-full min-w-max justify-start gap-1 rounded-xl bg-muted/60 p-1 sm:grid sm:min-w-0 sm:grid-cols-3">
              <TabsTrigger
                value="specs"
                className="min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 text-xs sm:text-sm"
              >
                Specifications
              </TabsTrigger>

              <TabsTrigger
                value="about"
                className="min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 text-xs sm:text-sm"
              >
                About
              </TabsTrigger>

              <TabsTrigger
                value="reviews"
                className="min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 text-xs sm:text-sm"
              >
                Reviews
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Specifications Content */}
          <TabsContent value="specs" className="mt-0 w-full min-w-0 space-y-3">
            <Card className="w-full overflow-hidden rounded-xl border shadow-sm">
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <Table className="w-full">
                    <TableBody>
                      {Object.entries(product.specs || {}).map(([k, v]) => (
                        <TableRow
                          key={k}
                          className="transition-colors hover:bg-muted/40"
                        >
                          <TableCell className="w-[40%] min-w-[110px] px-3 py-3 text-xs font-semibold text-muted-foreground sm:px-5 sm:py-4 sm:text-sm">
                            {k}
                          </TableCell>

                          <TableCell className="min-w-[140px] break-words whitespace-normal px-3 py-3 text-xs sm:px-5 sm:py-4 sm:text-sm">
                            {v}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Content */}
          <TabsContent value="about" className="mt-0 w-full min-w-0">
            <Card className="w-full rounded-xl border shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <p className="break-words text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Content */}
          <TabsContent value="reviews" className="mt-0 w-full min-w-0">
            <div className="w-full min-w-0 space-y-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <h3 className="text-base font-semibold sm:text-lg">
                  Customer Reviews
                </h3>

                <p className="text-xs text-muted-foreground">
                  Sample reviews shown for design preview.
                </p>
              </div>

              <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                {reviews.slice(0, 3).map((r) => (
                  <Card
                    key={r.id}
                    className="min-w-0 gap-3 rounded-xl border py-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:py-5"
                  >
                    <CardHeader className="gap-2 px-4 sm:px-5">
                      <RatingStars rating={r.rating} />

                      <CardTitle className="break-words text-sm font-semibold sm:text-base">
                        {r.title}
                      </CardTitle>

                      <CardDescription className="text-xs">
                        {r.name} &middot; {r.city}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="break-words px-4 text-sm leading-6 text-muted-foreground sm:px-5">
                      {r.text}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
