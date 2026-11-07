"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import CheckboxField from "@/components/forms/CheckboxField";
import FormField from "@/components/forms/FormField";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { brandSchema, categorySchema } from "@/lib/validations/catalog";
import { callApi } from "../api";

function NamedForm({ kind, defaultValues, submitLabel, onSubmit, onCancel, idPrefix }) {
  const form = useForm({ resolver: zodResolver(kind === "category" ? categorySchema : brandSchema), defaultValues });
  async function submit(values) {
    const ok = await onSubmit(values);
    if (ok) form.reset(defaultValues);
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="name" label="Name" idPrefix={idPrefix} />
        {kind === "category" ? (
          <CheckboxField
            control={form.control}
            name="tracksImei"
            label="Track IMEI for products in this category"
            description="Turn on for phones and tablets. Accessories usually do not need it."
            idPrefix={idPrefix}
          />
        ) : null}
        <CheckboxField control={form.control} name="active" label="Active" idPrefix={idPrefix} />
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

function Section({ tenantId, kind, items, canManage }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);
  const base = `/api/tenants/${tenantId}/${kind === "category" ? "categories" : "brands"}`;
  const title = kind === "category" ? "Categories" : "Brands";
  const blank = kind === "category" ? { name: "", tracksImei: false, active: true } : { name: "", active: true };

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
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
        <CardDescription>
          {kind === "category" ? "Categories decide whether products are IMEI-tracked." : "Phone and accessory makers."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : null}
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="py-3 text-sm">
              {editingId === item.id ? (
                <NamedForm
                  kind={kind}
                  idPrefix={`edit-${kind}-${item.id}`}
                  defaultValues={{ name: item.name, tracksImei: item.tracksImei, active: item.active }}
                  submitLabel="Save"
                  onSubmit={(values) => save("PATCH", `${base}/${item.id}`, values, `${kind === "category" ? "Category" : "Brand"} saved.`)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-medium">{item.name}</span>
                    {kind === "category" && item.tracksImei ? <span className="ms-2 text-xs text-muted-foreground">IMEI tracked</span> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    {!item.active ? <StatusBadge status="ARCHIVED" tone="neutral" /> : null}
                    {canManage ? (
                      <Button size="sm" variant="outline" onClick={() => setEditingId(item.id)}>
                        Edit
                      </Button>
                    ) : null}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
        {canManage ? (
          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium">Add {kind}</p>
            <NamedForm
              kind={kind}
              idPrefix={`new-${kind}`}
              defaultValues={blank}
              submitLabel={`Add ${kind}`}
              onSubmit={(values) => save("POST", base, values, `${kind === "category" ? "Category" : "Brand"} added.`)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function CatalogueManager({ tenantId, categories, brands, canManage }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section tenantId={tenantId} kind="category" items={categories} canManage={canManage} />
      <Section tenantId={tenantId} kind="brand" items={brands} canManage={canManage} />
    </div>
  );
}
