"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductImage } from "@/components/product/product-image";
import { formatPrice, formatStorage } from "@/lib/utils/format";
import { getAllProducts, getBrandName } from "@/services/catalog";

const NONE = "none";

export function CompareClient() {
  const phones = getAllProducts().filter((p) => p.category === "smartphones");
  const [ids, setIds] = useState([phones[0].id, phones[1].id, NONE]);

  const selected = ids.map((id) => phones.find((p) => p.id === id)).filter(Boolean);
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
      <div className="grid gap-5 sm:grid-cols-3">
        {ids.map((id, i) => (
          <Field key={i}>
            <FieldLabel htmlFor={`compare-${i}`}>Phone {i + 1}</FieldLabel>
            <Select
              value={id}
              onValueChange={(v) => setIds((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
            >
              <SelectTrigger id={`compare-${i}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {i === 2 && <SelectItem value={NONE}>None</SelectItem>}
                {phones.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={ids.includes(p.id) && ids[i] !== p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {i === 0 && <FieldDescription>Compare up to three phones.</FieldDescription>}
          </Field>
        ))}
      </div>

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
    </div>
  );
}
