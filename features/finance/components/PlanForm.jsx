"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { callApi } from "@/features/inventory/api";

import { formatPkr } from "@/lib/formatters/money";
import { installmentPlanSchema } from "@/lib/validations/finance";

const schema = installmentPlanSchema.omit({ saleId: true });

/** Spreads a credit sale's unpaid balance into equal installments. There is no interest or markup. */
export default function PlanForm({ tenantId, saleId, due, today }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { count: "3", firstDueDate: today, frequency: "MONTHLY" } });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/installments`, "POST", { ...values, saleId });
      toast.success("Installment plan created.");
      router.push(`/dashboard/installments/${saleId}`);
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card className="max-w-xl print:hidden">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Installment plan</CardTitle>
        <CardDescription>Spread the balance of {formatPkr(due)} into equal installments (whole rupees). No interest or markup is added. A plan cannot be edited afterwards.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="count" label="Number of installments" inputMode="numeric" idPrefix="plan" />
            <FormField control={form.control} name="frequency" label="Every" options={[{ value: "MONTHLY", label: "Month" }, { value: "WEEKLY", label: "Week" }]} idPrefix="plan" />
            <FormField control={form.control} name="firstDueDate" label="First due date" type="date" idPrefix="plan" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Create plan"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
