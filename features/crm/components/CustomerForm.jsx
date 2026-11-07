"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import CheckboxField from "@/components/forms/CheckboxField";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { customerSchema, customerUpdateSchema } from "@/lib/validations/crm";
import { callApi } from "@/features/inventory/api";

/** Create or edit a customer. Email, address, notes and the VIP/archive controls are shown only to roles allowed to see private details. */
export default function CustomerForm({ tenantId, customer, privateData, canPrivate }) {
  const router = useRouter();
  const editing = Boolean(customer);
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(editing ? customerUpdateSchema : customerSchema),
    defaultValues: {
      name: customer?.name ?? "", phone: customer?.phone ?? "", city: customer?.city ?? "",
      email: privateData?.email ?? "", address: privateData?.address ?? "", notes: privateData?.notes ?? "",
      vip: customer?.vip ?? false, marketingConsent: customer?.marketingConsent ?? false, status: customer?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      if (editing) await callApi(`/api/tenants/${tenantId}/customers/${customer.id}`, "PATCH", values);
      else await callApi(`/api/tenants/${tenantId}/customers`, "POST", values);
      toast.success(editing ? "Customer saved." : "Customer added.");
      if (!editing) form.reset();
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="font-heading text-lg">{editing ? "Edit customer" : "New customer"}</CardTitle>
        <CardDescription>Collect only what you need. One customer per phone number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="name" label="Name" autoComplete="off" idPrefix={editing ? "cedit" : "cnew"} />
            <FormField control={form.control} name="phone" label="Phone" inputMode="tel" idPrefix={editing ? "cedit" : "cnew"} />
            <FormField control={form.control} name="city" label="City" idPrefix={editing ? "cedit" : "cnew"} />
            {canPrivate ? (
              <>
                <FormField control={form.control} name="email" label="Email (optional)" type="email" idPrefix={editing ? "cedit" : "cnew"} />
                <FormField control={form.control} name="address" label="Address (optional)" idPrefix={editing ? "cedit" : "cnew"} />
                <FormField control={form.control} name="notes" label="Private notes" multiline idPrefix={editing ? "cedit" : "cnew"} />
                <CheckboxField control={form.control} name="vip" label="VIP customer" idPrefix={editing ? "cedit" : "cnew"} />
              </>
            ) : null}
            <CheckboxField control={form.control} name="marketingConsent" label="Agreed to receive offers and reminders" description="Tick only if the customer said yes." idPrefix={editing ? "cedit" : "cnew"} />
            {editing && canPrivate ? (
              <FormField control={form.control} name="status" label="Status" options={[{ value: "ACTIVE", label: "Active" }, { value: "ARCHIVED", label: "Archived (hidden from POS)" }]} idPrefix="cedit" />
            ) : null}
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : editing ? "Save customer" : "Add customer"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
