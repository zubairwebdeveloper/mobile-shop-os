"use client";

import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductImage } from "@/components/product/product-image";
import { EmptyState } from "@/components/shared/empty-state";
import { clearCompare, setCompareSlot } from "@/store/slices/comparison-slice";
import { formatPrice, formatStorage } from "@/lib/utils/format";
import { getAllProducts, getBrandName } from "@/services/catalog";
import { useHydrated } from "@/hooks/use-hydrated";

const NONE = "none";

export function CompareClient() {
  const dispatch = useDispatch();
  const { slots, hydrated: storeReady } = useSelector((state) => state.comparison);
  const hydrated = useHydrated() && storeReady;
  const phones = getAllProducts().filter((p) => p.category === "smartphones");

  if (!hydrated) return <Skeleton className="h-96" />;

  const selected = slots.map((id) => phones.find((p) => p.id === id)).filter(Boolean);
  const specKeys = [...new Set(selected.flatMap((p) => Object.keys(p.specs)))];

  const rows = [
    ["Price", (p) => formatPrice(p.price)],
    ["Brand", (p) => getBrandName(p.brand)],
    ["Condition", (p) => p.condition],
    ["RAM", (p) => p.rams.map((r) => `${r}GB`).join(" / ") || "-"],
    ["Storage", (p) => p.storages.map(formatStorage).join(" / ") || "-"],
    ["Rating", (p) => `${p.rating.toFixed(1)} (${p.reviewCount} reviews)`],
    ["Availability", (p) => (p.stock > 0 ? "In stock" : "Out of stock")],
    ...specKeys.map((k) => [k, (p) => p.specs[k] ?? "-"]),
  ];

  return (
    <div className="space-y-8">
      <div className="grid items-end gap-5 sm:grid-cols-4">
        {slots.map((id, i) => (
          <Field key={i}>
            <FieldLabel htmlFor={`compare-${i}`}>Phone {i + 1}</FieldLabel>
            <Select
              value={id || NONE}
              onValueChange={(v) => dispatch(setCompareSlot({ index: i, id: v === NONE ? "" : v }))}
            >
              <SelectTrigger id={`compare-${i}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {phones.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={slots.includes(p.id) && slots[i] !== p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {i === 0 && <FieldDescription>Compare up to three phones.</FieldDescription>}
          </Field>
        ))}
        <Button variant="outline" onClick={() => dispatch(clearCompare())} disabled={selected.length === 0}>
          Clear all
        </Button>
      </div>

      {selected.length < 2 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Pick at least two phones"
          description="Choose phones above, or tap the compare icon on any smartphone in the shop."
          href="/shop"
          actionLabel="Browse phones"
        />
      ) : (
        <Card className="py-2">
          <CardContent className="px-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-40" />
                  {selected.map((p) => (
                    <TableHead key={p.id} className="min-w-52 py-4 align-top">
                      <Link href={`/product/${p.slug}`} className="block space-y-2 hover:text-primary">
                        <ProductImage shape={p.shape} color={p.colors[0].hex} label={p.name} className="aspect-[4/3] rounded-xl" />
                        <span className="block">{p.name}</span>
                      </Link>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(([label, get]) => (
                  <TableRow key={label}>
                    <TableCell className="font-semibold text-muted-foreground">{label}</TableCell>
                    {selected.map((p) => (
                      <TableCell key={p.id}>{get(p)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
