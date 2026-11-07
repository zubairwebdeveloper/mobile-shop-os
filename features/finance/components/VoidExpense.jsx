"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";

import { FieldGroup } from "@/components/ui/field";
import { callApi } from "@/features/inventory/api";

import { expenseVoidSchema } from "@/lib/validations/finance";

/** Expenses are never deleted; voiding keeps the record and removes it from the totals. */
export default function VoidExpense({ tenantId, id }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const form = useForm({ resolver: zodResolver(expenseVoidSchema), defaultValues: { reason: "" } });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/expenses/${id}`, "PATCH", values);
      toast.success("Expense voided.");
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (!open) return <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>Void</Button>;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-2 w-full max-w-sm">
      <FieldGroup>
        <FormField control={form.control} name="reason" label="Why is it void?" idPrefix={`void-${id}`} />
        {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>Void expense</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </FieldGroup>
    </form>
  );
}
