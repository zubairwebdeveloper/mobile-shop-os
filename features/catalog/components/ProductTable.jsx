"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Smartphone } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { matchesQuery } from "@/lib/catalog/pure";

const SELECT =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

export default function ProductTable({ products, categories }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const rows = useMemo(
    () =>
      products.filter(
        (p) =>
          (!categoryId || p.categoryId === categoryId) &&
          (status === "ALL" || p.status === status) &&
          matchesQuery(query, p.name, p.brandName, p.barcode)
      ),
    [products, query, categoryId, status]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <Input id="product-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, brand or barcode" className="max-w-sm" />
        <label htmlFor="product-category" className="sr-only">
          Category
        </label>
        <select id="product-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={SELECT}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor="product-status" className="sr-only">
          Status
        </label>
        <select id="product-status" value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT}>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Smartphone} title={products.length === 0 ? "No products yet" : "No products match"} description={products.length === 0 ? "Add your first product to start building the catalogue." : "Try a different search or filter."} />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 font-medium">Variants</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/products/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{p.brandName}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.categoryName}
                    {p.tracksImei ? <span className="block text-xs text-muted-foreground">IMEI tracked</span> : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p.variantCount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} tone={p.status === "ACTIVE" ? "success" : "neutral"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
