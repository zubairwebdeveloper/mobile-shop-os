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
import { formatPkr } from "@/lib/formatters/money";
import { closingSchema } from "@/lib/validations/sales";
import { callApi } from "@/features/inventory/api";

export default function ClosingForm({ tenantId, branches, today }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const [result, setResult] = useState(null);
  const form = useForm({
    resolver: zodResolver(closingSchema),
    defaultValues: { branchId: branches[0]?.id ?? "", date: today, openingCash: "0", countedCash: "", note: "" },
  });

  async function onSubmit(values) {
    setFormError(null);
    setResult(null);
    try {
      const r = await callApi(`/api/tenants/${tenantId}/daily-closings`, "POST", values);
      setResult(r);
      toast.success("Day closed.");
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Close the day</CardTitle>
        <CardDescription>Count the cash drawer, enter the amount, and the system compares it with what the sales say it should be. One closing per branch per day; it cannot be edited afterwards.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="branchId" label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} idPrefix="close" />
            <FormField control={form.control} name="date" label="Date" type="date" idPrefix="close" />
            <FormField control={form.control} name="openingCash" label="Opening cash in drawer (PKR)" inputMode="numeric" idPrefix="close" />
            <FormField control={form.control} name="countedCash" label="Cash counted now (PKR)" inputMode="numeric" idPrefix="close" />
            <FormField control={form.control} name="note" label="Note" multiline idPrefix="close" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            {result ? (
              <p role="status" className="text-sm tabular-nums">
                Expected {formatPkr(result.expectedCash)} · difference {result.difference === 0 ? "none" : formatPkr(result.difference)}
              </p>
            ) : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Closing..." : "Close day"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
