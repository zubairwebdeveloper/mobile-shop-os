"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUtcDate } from "@/lib/formatters/date";

const FILTERS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
];

export default function TenantTable({ tenants }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((tenant) => {
      if (status !== "ALL" && tenant.status !== status) return false;
      if (!q) return true;
      return [tenant.name, tenant.slug, tenant.ownerName, tenant.city, tenant.planId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [tenants, query, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="tenant-search" className="sr-only">
          Search shops
        </label>
        <Input
          id="tenant-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, address, owner, city or plan"
          className="max-w-sm"
        />
        <div className="flex gap-1" role="group" aria-label="Filter by status">
          {FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              size="sm"
              variant={status === filter.value ? "default" : "outline"}
              aria-pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Building2} title="No shops match" description="Try a different search or filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Shop</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Plan</th>
                <th scope="col" className="px-4 py-3 font-medium">Branches</th>
                <th scope="col" className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-4 py-3">
                    <Link href={`/platform/tenants/${tenant.id}`} className="font-medium underline-offset-4 hover:underline">
                      {tenant.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {[tenant.ownerName, tenant.city].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tenant.status} />
                  </td>
                  <td className="px-4 py-3">
                    {tenant.planId ?? "—"}
                    {tenant.subscriptionStatus ? (
                      <span className="block text-xs text-muted-foreground">{tenant.subscriptionStatus.toLowerCase().replace("_", " ")}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {tenant.branchesUsed} / {tenant.maxBranches}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                    {formatUtcDate(tenant.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of the latest {tenants.length} shops.
      </p>
    </div>
  );
}
