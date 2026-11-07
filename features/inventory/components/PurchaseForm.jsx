"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { paisaToRupees } from "@/lib/catalog/pure";
import { purchaseCreateSchema } from "@/lib/validations/inventory";
import { callApi } from "../api";

export default function PurchaseForm({ tenantId, suppliers, branches, variants }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const variantOptions = variants.map((v) => ({ value: v.id, label: `${v.productName} (${v.variantLabel})${v.tracksImei ? " · IMEI" : ""}` }));

  const form = useForm({
    resolver: zodResolver(purchaseCreateSchema),
    defaultValues: {
      supplierId: suppliers[0]?.id ?? "",
      branchId: branches[0]?.id ?? "",
      note: "",
      items: [{ variantId: variants[0]?.id ?? "", quantity: "1", unitCost: paisaToRupees(variants[0]?.purchasePrice ?? null) }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  async function onSubmit(values) {
    setFormError(null);
    try {
      const { id } = await callApi(`/api/tenants/${tenantId}/purchases`, "POST", values);
      toast.success("Purchase order created as a draft.");
      router.push(`/dashboard/purchases/${id}`);
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (suppliers.length === 0 || variants.length === 0) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6 text-sm">
          You need at least one active supplier and one active product variant before creating a purchase order.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="font-heading text-lg">New purchase order</CardTitle>
        <CardDescription>Costs are per unit, in whole PKR. The order stays a draft until you mark it ordered.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="supplierId" label="Supplier" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} idPrefix="po" />
            <FormField control={form.control} name="branchId" label="Receiving branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} idPrefix="po" />

            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">Items</legend>
              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 border-b pb-4 last:border-0 last:pb-0 sm:grid-cols-[1fr_90px_120px_auto] sm:items-end">
                  <FormField control={form.control} name={`items.${index}.variantId`} label="Product" options={variantOptions} idPrefix="po" />
                  <FormField control={form.control} name={`items.${index}.quantity`} label="Qty" type="number" idPrefix="po" />
                  <FormField control={form.control} name={`items.${index}.unitCost`} label="Unit cost (PKR)" inputMode="numeric" idPrefix="po" />
                  <Button type="button" variant="outline" size="sm" onClick={() => remove(index)} disabled={fields.length === 1} aria-label={`Remove item ${index + 1}`}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ variantId: variants[0].id, quantity: "1", unitCost: "" })} disabled={fields.length >= 50}>
                Add item
              </Button>
              {form.formState.errors.items?.message ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.items.message}</p> : null}
            </fieldset>

            <FormField control={form.control} name="note" label="Note" multiline idPrefix="po" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating..." : "Create purchase order"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
