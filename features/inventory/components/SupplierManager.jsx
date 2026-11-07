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
import { supplierSchema } from "@/lib/validations/inventory";
import { callApi } from "../api";

const BLANK = { name: "", phone: "", city: "", address: "", notes: "", active: true };

function SupplierForm({ defaultValues, submitLabel, onSubmit, onCancel, idPrefix }) {
  const form = useForm({ resolver: zodResolver(supplierSchema), defaultValues });
  async function submit(values) {
    if (await onSubmit(values)) form.reset(defaultValues);
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="name" label="Supplier name" idPrefix={idPrefix} />
        <FormField control={form.control} name="phone" label="Phone" type="tel" inputMode="tel" idPrefix={idPrefix} />
        <FormField control={form.control} name="city" label="City" idPrefix={idPrefix} />
        <FormField control={form.control} name="address" label="Address" multiline idPrefix={idPrefix} />
        <FormField control={form.control} name="notes" label="Notes" multiline idPrefix={idPrefix} />
        <CheckboxField control={form.control} name="active" label="Active" idPrefix={idPrefix} />
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : submitLabel}
          </Button>
          {onCancel ? <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button> : null}
        </div>
      </FieldGroup>
    </form>
  );
}

export default function SupplierManager({ tenantId, suppliers, canManage }) {
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
      <section aria-label="Suppliers" className="space-y-4">
        {suppliers.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No suppliers yet.</p> : null}
        {suppliers.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-heading text-lg">{s.name}</CardTitle>
                {!s.active ? <StatusBadge status="ARCHIVED" tone="neutral" /> : null}
              </div>
              <CardDescription>{[s.phone, s.city].filter(Boolean).join(" · ") || "No contact details"}</CardDescription>
            </CardHeader>
            <CardContent>
              {editingId === s.id ? (
                <SupplierForm
                  idPrefix={`edit-${s.id}`}
                  defaultValues={{ name: s.name, phone: s.phone, city: s.city, address: s.address, notes: s.notes, active: s.active }}
                  submitLabel="Save"
                  onSubmit={(v) => save("PATCH", `/api/tenants/${tenantId}/suppliers/${s.id}`, v, "Supplier saved.")}
                  onCancel={() => setEditingId(null)}
                />
              ) : canManage ? (
                <Button size="sm" variant="outline" onClick={() => setEditingId(s.id)}>Edit</Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>
      {canManage ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Add supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierForm idPrefix="new-supplier" defaultValues={BLANK} submitLabel="Add supplier" onSubmit={(v) => save("POST", `/api/tenants/${tenantId}/suppliers`, v, "Supplier added.")} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
