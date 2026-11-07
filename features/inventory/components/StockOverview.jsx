"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { matchesQuery } from "@/lib/catalog/pure";
import { adjustSchema } from "@/lib/validations/inventory";
import { callApi } from "../api";

const REASONS = [
  { value: "DAMAGE", label: "Damaged" },
  { value: "LOSS", label: "Lost or stolen" },
  { value: "FOUND", label: "Found" },
  { value: "COUNT_CORRECTION", label: "Count correction" },
  { value: "OTHER", label: "Other" },
];

export default function StockOverview({ tenantId, stock, branches, lowStock, adjustVariants, canAdjust, canRecount }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState("");
  const [formError, setFormError] = useState(null);
  const branchName = (id) => branches.find((b) => b.id === id)?.name ?? "Branch";

  const rows = useMemo(
    () => stock.filter((s) => (!branchId || s.branchId === branchId) && matchesQuery(query, s.productName, s.variantLabel)),
    [stock, query, branchId]
  );

  const form = useForm({
    resolver: zodResolver(adjustSchema),
    defaultValues: { variantId: adjustVariants[0]?.value ?? "", branchId: branches[0]?.id ?? "", delta: "", reason: "COUNT_CORRECTION", note: "" },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/inventory/adjust`, "POST", values);
      toast.success("Stock adjusted.");
      form.reset({ ...form.getValues(), delta: "", note: "" });
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  async function recount() {
    try {
      const { changed } = await callApi(`/api/tenants/${tenantId}/inventory/recount`, "POST");
      toast.success(changed === 0 ? "IMEI stock already matches the devices." : `Corrected ${changed} stock line(s).`);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="space-y-6">
      {lowStock.length > 0 ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Low stock ({lowStock.length})</CardTitle>
            <CardDescription>At or below the minimum stock set on the variant.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {lowStock.slice(0, 10).map((v) => (
                <li key={v.id} className="flex justify-between gap-3">
                  <span className="truncate">{v.productName} · {v.variantLabel}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{v.quantity} / min {v.minStock}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Stock" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="stock-search" className="sr-only">Search stock</label>
            <Input id="stock-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product" className="max-w-xs" />
            <label htmlFor="stock-branch" className="sr-only">Branch</label>
            <select id="stock-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm dark:bg-input/30">
              <option value="">All my branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <Link href="/dashboard/transfers" className="text-sm underline underline-offset-4">Branch transfers</Link>
            {canRecount ? <Button size="sm" variant="outline" onClick={recount}>Recount IMEI stock</Button> : null}
          </div>
          {rows.length === 0 ? (
            <EmptyState title={stock.length === 0 ? "No stock yet" : "No stock matches"} description={stock.length === 0 ? "Receive a purchase order or register devices to add stock." : "Try a different search or branch."} />
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Product</th>
                    <th scope="col" className="px-4 py-3 font-medium">Branch</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3">{s.productName}<span className="block text-xs text-muted-foreground">{s.variantLabel}</span></td>
                      <td className="px-4 py-3">{branchName(s.branchId)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {canAdjust ? (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Adjust stock</CardTitle>
              <CardDescription>For products without IMEI. Use a negative number to remove stock. IMEI devices change through their own status.</CardDescription>
            </CardHeader>
            <CardContent>
              {adjustVariants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No non-IMEI products yet.</p>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                  <FieldGroup>
                    <FormField control={form.control} name="variantId" label="Product" options={adjustVariants} idPrefix="adj" />
                    <FormField control={form.control} name="branchId" label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} idPrefix="adj" />
                    <FormField control={form.control} name="delta" label="Change (+/-)" type="number" idPrefix="adj" />
                    <FormField control={form.control} name="reason" label="Reason" options={REASONS} idPrefix="adj" />
                    <FormField control={form.control} name="note" label="Note" idPrefix="adj" />
                    {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
                    <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Apply adjustment"}</Button>
                  </FieldGroup>
                </form>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
