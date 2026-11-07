"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { callApi } from "@/features/inventory/api";

/** Register warranty for the units on an invoice (one warranty per device / per plain line). */
export default function RegisterWarranty({ tenantId, sale, today }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const [picked, setPicked] = useState({});
  const lines = sale.items
    .map((i) => ({ item: i, units: i.imeis.length > 0 ? i.returnableImeis.map((n) => ({ key: `${i.variantId}:${n}`, label: n, imei: n })) : i.quantity - i.returnedQty > 0 ? [{ key: i.variantId, label: `${i.quantity - i.returnedQty} unit(s)`, imei: null }] : [] }))
    .filter((l) => l.units.length > 0);
  const form = useForm({ defaultValues: { months: "12", startDate: sale.createdAt.slice(0, 10) <= today ? sale.createdAt.slice(0, 10) : today, terms: "" } });

  async function onSubmit(values) {
    setFormError(null);
    const items = lines
      .map((l) => ({ variantId: l.item.variantId, imeis: l.units.filter((u) => u.imei && picked[u.key]).map((u) => u.imei), plain: l.units.some((u) => !u.imei && picked[u.key]) }))
      .filter((x) => x.imeis.length > 0 || x.plain)
      .map(({ variantId, imeis }) => ({ variantId, imeis }));
    if (items.length === 0) return void setFormError("Tick at least one item.");
    try {
      const r = await callApi(`/api/tenants/${tenantId}/warranties`, "POST", { saleId: sale.id, months: Number(values.months), startDate: values.startDate, terms: values.terms, items });
      toast.success(`Warranty registered (${r.ids.length}).`);
      setPicked({});
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (lines.length === 0) return null;

  return (
    <Card className="max-w-2xl print:hidden">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Register warranty</CardTitle>
        <CardDescription>Tick the items to cover. Each device gets its own warranty and certificate.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {lines.map((l) => (
              <fieldset key={l.item.variantId} className="space-y-1 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">{l.item.productName} · {l.item.variantLabel}</legend>
                {l.units.map((u) => (
                  <label key={u.key} className="flex min-h-9 items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={picked[u.key] === true} onChange={(e) => setPicked((p) => ({ ...p, [u.key]: e.target.checked }))} />
                    <span className="tabular-nums">{u.label}</span>
                  </label>
                ))}
              </fieldset>
            ))}
            <FormField control={form.control} name="months" label="Warranty (months)" type="number" idPrefix="warr" />
            <FormField control={form.control} name="startDate" label="Starts on" type="date" idPrefix="warr" />
            <FormField control={form.control} name="terms" label="Terms (shown on the certificate)" multiline idPrefix="warr" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Register warranty"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
