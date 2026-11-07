"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { formatPkr } from "@/lib/formatters/money";
import { paisaToRupees, variantLabel } from "@/lib/catalog/pure";
import { variantSchema } from "@/lib/validations/catalog";
import { callApi } from "../api";

const STATUS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

const BLANK = {
  storage: "", ram: "", color: "", sku: "", barcode: "",
  purchasePrice: "", sellingPrice: "", wholesalePrice: "", minStock: "0", status: "ACTIVE",
};

const toForm = (v) => ({
  storage: v.storage, ram: v.ram, color: v.color, sku: v.sku, barcode: v.barcode,
  purchasePrice: paisaToRupees(v.purchasePrice), sellingPrice: paisaToRupees(v.sellingPrice),
  wholesalePrice: paisaToRupees(v.wholesalePrice), minStock: String(v.minStock), status: v.status,
});

function VariantForm({ defaultValues, submitLabel, onSubmit, onCancel, idPrefix }) {
  const form = useForm({ resolver: zodResolver(variantSchema), defaultValues });
  async function submit(values) {
    const ok = await onSubmit(values);
    if (ok) form.reset(defaultValues);
  }
  const f = (name, label, extra = {}) => (
    <FormField control={form.control} name={name} label={label} idPrefix={idPrefix} {...extra} />
  );
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        {f("storage", "Storage", { placeholder: "128GB" })}
        {f("ram", "RAM", { placeholder: "8GB" })}
        {f("color", "Colour")}
        {f("sku", "SKU (optional)")}
        {f("barcode", "Barcode (optional)")}
        {f("purchasePrice", "Purchase price (PKR)", { inputMode: "numeric" })}
        {f("sellingPrice", "Selling price (PKR)", { inputMode: "numeric" })}
        {f("wholesalePrice", "Wholesale price (PKR)", { inputMode: "numeric" })}
        {f("minStock", "Minimum stock", { type: "number", description: "Used for low-stock alerts from Phase 7." })}
        {f("status", "Status", { options: STATUS })}
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}

export default function VariantManager({ tenantId, productId, variants, canManage }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);

  async function save(method, url, values, message) {
    try {
      await callApi(url, method, values);
      toast.success(message);
      setEditingId(null);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section aria-label="Variants" className="space-y-4">
        {variants.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No variants yet. A product needs at least one variant (even a single &quot;Standard&quot; one) before it can be stocked or sold.
          </p>
        ) : null}
        {variants.map((v) => (
          <Card key={v.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-heading text-lg">{variantLabel(v)}</CardTitle>
                <StatusBadge status={v.status} tone={v.status === "ACTIVE" ? "success" : "neutral"} />
              </div>
              <CardDescription>
                {[v.sku && `SKU ${v.sku}`, v.barcode && `Barcode ${v.barcode}`].filter(Boolean).join(" · ") || "No SKU or barcode"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingId === v.id ? (
                <VariantForm
                  idPrefix={`edit-${v.id}`}
                  defaultValues={toForm(v)}
                  submitLabel="Save variant"
                  onSubmit={(values) => save("PATCH", `/api/tenants/${tenantId}/variants/${v.id}`, values, "Variant saved.")}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="space-y-3 text-sm">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                    <div><dt className="text-muted-foreground">Purchase</dt><dd className="font-medium">{formatPkr(v.purchasePrice)}</dd></div>
                    <div><dt className="text-muted-foreground">Selling</dt><dd className="font-medium">{formatPkr(v.sellingPrice)}</dd></div>
                    <div><dt className="text-muted-foreground">Wholesale</dt><dd className="font-medium">{formatPkr(v.wholesalePrice)}</dd></div>
                    <div><dt className="text-muted-foreground">Min stock</dt><dd className="font-medium">{v.minStock}</dd></div>
                  </dl>
                  {canManage ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingId(v.id)}>
                      Edit
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      {canManage ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Add variant</CardTitle>
            <CardDescription>Leave storage, RAM and colour empty for a product with no options.</CardDescription>
          </CardHeader>
          <CardContent>
            <VariantForm
              idPrefix="new-variant"
              defaultValues={BLANK}
              submitLabel="Add variant"
              onSubmit={(values) => save("POST", `/api/tenants/${tenantId}/products/${productId}/variants`, values, "Variant added.")}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
