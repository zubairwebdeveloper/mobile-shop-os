"use client";

import { motion } from "framer-motion";
import {
  ClipboardList,
  Info,
  Star,
  CheckCircle2,
  ShieldCheck,
  Truck,
  PackageOpen,
  Sparkles,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

import { RatingStars } from "@/components/product/rating-stars";

const tabItems = [
  {
    value: "specs",
    label: "Specifications",
    shortLabel: "Specs",
    icon: ClipboardList,
  },
  {
    value: "about",
    label: "About Product",
    shortLabel: "About",
    icon: Info,
  },
  {
    value: "reviews",
    label: "Customer Reviews",
    shortLabel: "Reviews",
    icon: Star,
  },
];

// Panel entry animation CSS se hoti hai (tw-animate-css). Framer-motion ka `initial` SSR HTML mein
// inline opacity/transform likhta hai jo hydration mismatch deta hai, isliye yahan use nahi kiya.
const PANEL_ANIMATION =
  "animate-in fade-in-0 slide-in-from-bottom-2 duration-300";

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <CardHeader className="gap-1 border-b bg-muted/20 px-4 py-4 sm:px-6">
      <CardTitle className="flex items-center gap-2 text-base font-bold">
        <Icon className="size-5 text-primary" />
        {title}
      </CardTitle>

      <CardDescription className="text-xs sm:text-sm">
        {description}
      </CardDescription>
    </CardHeader>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-7 text-muted-foreground/60" />
      </div>

      <h3 className="text-sm font-bold">{title}</h3>

      <p className="mt-1 text-xs leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <motion.div
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className="group flex items-center gap-3 rounded-xl border bg-muted/20 p-4 transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5 text-primary transition-colors group-hover:text-primary-foreground" />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold">{title}</p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

function ReviewCard({ review, index }) {
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-300"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <Card className="gap-3 rounded-2xl border-border/70 py-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
        <CardHeader className="gap-3 px-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold">
                {review.title || "Customer Review"}
              </CardTitle>

              <CardDescription className="mt-1">
                {review.name || "Customer"}
                {review.city ? ` · ${review.city}` : ""}
              </CardDescription>
            </div>

            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
          </div>

          <RatingStars rating={review.rating || 0} />
        </CardHeader>

        <CardContent className="px-4 sm:px-5">
          <p className="text-sm leading-7 text-muted-foreground">
            {review.text || "No review description available."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProductDetailsTabs({ product, reviews = [] }) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const specs =
    product.specs &&
    typeof product.specs === "object" &&
    !Array.isArray(product.specs)
      ? Object.entries(product.specs)
      : [];

  const description = product.description || product.summary || "";

  const rating = Number(product.rating || 0);

  const reviewCount = product.reviewCount ?? safeReviews.length;

  return (
    <Tabs defaultValue="specs" className="flex w-full flex-col gap-5">
      {/* Tabs Navigation */}

      <div className="sticky top-20 z-20 rounded-2xl border bg-background/95 p-1.5 shadow-sm backdrop-blur-xl">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabItems.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="group relative min-h-11 min-w-fit flex-1 gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none data-active:bg-primary/10 data-active:text-primary data-active:shadow-none sm:gap-2 sm:px-4 sm:text-sm"
              >
                <Icon className="size-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />

                <span className="hidden sm:inline">{tab.label}</span>

                <span className="sm:hidden">{tab.shortLabel}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {/* Specifications */}

      <TabsContent value="specs" className="mt-0 outline-none">
        <div className={PANEL_ANIMATION}>
          <Card className="overflow-hidden rounded-2xl border-border/70 py-0 shadow-sm transition-shadow duration-300 hover:shadow-md">
            <SectionHeader
              icon={ClipboardList}
              title="Technical Specifications"
              description="Detailed technical information about this product."
            />

            <CardContent className="p-0">
              {specs.length > 0 ? (
                <Table>
                  <TableBody>
                    {specs.map(([key, value]) => (
                      <TableRow
                        key={key}
                        className="group transition-colors duration-200 hover:bg-primary/5"
                      >
                        <TableCell className="w-2/5 px-4 py-3.5 align-top whitespace-normal text-xs font-semibold text-muted-foreground sm:px-6 sm:text-sm">
                          {key}
                        </TableCell>

                        <TableCell className="px-4 py-3.5 align-top whitespace-normal text-right text-xs font-semibold sm:px-6 sm:text-left sm:text-sm">
                          {String(value ?? "N/A")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={PackageOpen}
                  title="No specifications available"
                  description="Product specifications will appear here."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* About Product */}

      <TabsContent value="about" className="mt-0 outline-none">
        <div className={PANEL_ANIMATION}>
          <Card className="overflow-hidden rounded-2xl border-border/70 py-0 shadow-sm transition-shadow duration-300 hover:shadow-md">
            <SectionHeader
              icon={Info}
              title="About This Product"
              description="Everything you need to know before purchasing."
            />

            <CardContent className="space-y-6 p-4 sm:p-6">
              {/* Product Description */}

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />

                  <h3 className="text-sm font-bold">Product Description</h3>
                </div>

                <p className="text-sm leading-8 text-muted-foreground">
                  {description || "No product description available."}
                </p>
              </div>

              {/* Product Features */}

              <div className="grid gap-3 sm:grid-cols-2">
                <FeatureCard
                  icon={ShieldCheck}
                  title="Quality Assured"
                  description="Carefully selected products with quality in mind."
                />

                <FeatureCard
                  icon={Truck}
                  title="Reliable Delivery"
                  description="Convenient nationwide delivery service."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Customer Reviews */}

      <TabsContent value="reviews" className="mt-0 outline-none">
        <div className={`${PANEL_ANIMATION} space-y-4`}>
          {/* Reviews Summary */}

          <Card className="rounded-2xl border-border/70 bg-muted/20 py-0 shadow-sm">
            <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div>
                <h3 className="text-base font-bold">Customer Reviews</h3>

                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Discover what customers think about this product.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Star className="size-5 fill-amber-400 text-amber-400" />

                <span className="text-lg font-extrabold tabular-nums">
                  {rating.toFixed(1)}
                </span>

                <span className="text-xs text-muted-foreground">
                  / 5 ({reviewCount} reviews)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Review Cards */}

          {safeReviews.length > 0 ? (
            <div className="grid gap-4">
              {safeReviews.slice(0, 3).map((review, index) => (
                <ReviewCard
                  key={review.id ?? index}
                  review={review}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl border-dashed shadow-none">
              <CardContent className="p-0">
                <EmptyState
                  icon={Star}
                  title="No reviews yet"
                  description="Be the first to share your experience."
                />
              </CardContent>
            </Card>
          )}

          {/* Reviews Count */}

          {safeReviews.length > 3 && (
            <p className="text-center text-xs text-muted-foreground">
              Showing 3 of {safeReviews.length} reviews.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
