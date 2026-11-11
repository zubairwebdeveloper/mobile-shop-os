"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product/product-image";
import { PriceTag } from "@/components/product/price-tag";
import { MOCK_SCORES } from "@/data/mock/scores";
import { formatPrice } from "@/lib/utils/format";
import { getAllProducts, getBrandName } from "@/services/catalog";

const PRIORITIES = [
  { key: "camera", label: "Camera quality", hint: "Photos, video and low-light shots" },
  { key: "battery", label: "Battery life", hint: "How long it lasts per charge" },
  { key: "performance", label: "Performance", hint: "Gaming, multitasking and speed" },
];

export function FinderClient() {
  const [budget, setBudget] = useState([200000]);
  const [weights, setWeights] = useState({ camera: 3, battery: 3, performance: 3 });

  const results = useMemo(() => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    return getAllProducts()
      .filter((p) => MOCK_SCORES[p.slug] && p.price <= budget[0] && p.inStock)
      .map((p) => {
        const s = MOCK_SCORES[p.slug];
        const score = PRIORITIES.reduce((sum, { key }) => sum + s[key] * weights[key], 0) / total;
        return { product: p, match: Math.round(score * 10) };
      })
      .sort((a, b) => b.match - a.match)
      .slice(0, 3);
  }, [budget, weights]);

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Your preferences</CardTitle>
          <CardDescription>Adjust the sliders and results update instantly.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="finder-budget">Maximum budget: {formatPrice(budget[0])}</FieldLabel>
              <Slider id="finder-budget" min={30000} max={400000} step={5000} value={budget} onValueChange={setBudget} />
              <FieldDescription>We only show phones at or below this price.</FieldDescription>
            </Field>
            {PRIORITIES.map(({ key, label, hint }) => (
              <Field key={key}>
                <FieldLabel>
                  {label}: {weights[key]}/5
                </FieldLabel>
                <Slider
                  min={0}
                  max={5}
                  step={1}
                  value={[weights[key]]}
                  onValueChange={([v]) => setWeights((w) => ({ ...w, [key]: v }))}
                />
                <FieldDescription>{hint}</FieldDescription>
              </Field>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                setBudget([200000]);
                setWeights({ camera: 3, battery: 3, performance: 3 });
              }}
            >
              Reset
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="space-y-5" aria-live="polite">
        {results.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No matches yet</CardTitle>
              <CardDescription>Try raising your budget to see more phones.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          results.map(({ product, match }, i) => (
            <Card key={product.id} className="overflow-hidden py-0">
              <div className="grid gap-0 sm:grid-cols-[14rem_1fr]">
                <ProductImage shape={product.shape} color={product.colors[0].hex} label={product.name} className="aspect-[4/3] sm:aspect-auto sm:h-full" />
                <div className="space-y-3 p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {i === 0 && (
                      <Badge>
                        <Trophy /> Best match
                      </Badge>
                    )}
                    <Badge variant="mint">{match}% match</Badge>
                  </div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {getBrandName(product.brand)}
                  </p>
                  <h3 className="font-heading text-xl font-bold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.summary}</p>
                  <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
                  <Link href={`/product/${product.slug}`} className="inline-block text-sm font-semibold text-primary hover:underline">
                    View details
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
        <p className="text-xs text-muted-foreground">
          Match scores use editorial demo ratings. Prices and stock come from the store catalog.
        </p>
      </div>
    </div>
  );
}
