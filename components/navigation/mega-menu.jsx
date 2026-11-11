"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { PriceTag } from "@/components/product/price-tag";
import { getBrands, getCategories, getFeatured } from "@/services/catalog";

export function MegaMenu({ onNavigate }) {
  const categories = getCategories();
  const brands = getBrands();
  const spotlight = getFeatured()[0];

  return (
    <div className="grid gap-8 py-8 lg:grid-cols-[1fr_1fr_1.1fr]">
      <div>
        <h3 className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">Categories</h3>
        <ul className="space-y-1">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/categories/${c.slug}`}
                onClick={onNavigate}
                className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted"
              >
                <span className="block text-sm font-semibold">{c.name}</span>
                <span className="block text-xs text-muted-foreground">{c.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">Brands</h3>
        <ul className="grid grid-cols-2 gap-1">
          {brands.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/brands/${b.slug}`}
                onClick={onNavigate}
                className="block rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted"
              >
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/shop"
          onClick={onNavigate}
          className="mt-4 inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-primary hover:underline"
        >
          Browse all products <ArrowRight className="size-4" />
        </Link>
      </div>

      {spotlight && (
        <Link
          href={`/product/${spotlight.slug}`}
          onClick={onNavigate}
          className="group grid grid-cols-[120px_1fr] items-center gap-4 rounded-2xl border bg-muted/40 p-4 transition-colors hover:border-primary/40"
        >
          <ProductImage shape={spotlight.shape} color={spotlight.colors[0].hex} label={spotlight.name} className="rounded-xl" />
          <div>
            <p className="text-xs font-bold tracking-widest text-accent uppercase">Spotlight</p>
            <p className="mt-1 font-heading text-lg font-bold group-hover:text-primary">{spotlight.name}</p>
            <PriceTag price={spotlight.price} className="mt-1" />
          </div>
        </Link>
      )}
    </div>
  );
}
