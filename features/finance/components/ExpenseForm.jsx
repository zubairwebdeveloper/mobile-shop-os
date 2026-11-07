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

import { expenseSchema } from "@/lib/validations/finance";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer (record)" },
  { value: "JAZZCASH", label: "JazzCash (record)" },
  { value: "EASYPAISA", label: "Easypaisa (record)" },
];
const CATEGORIES = ["RENT", "SALARY", "UTILITIES", "TRANSPORT", "MARKETING", "MAINTENANCE", "SUPPLIES", "TAX_AND_FEES", "OTHER"].map((c) => ({ value: c, label: c.toLowerCase().replace(/_/g, " ").replace(/^\w/, (x) => x.toUpperCase()) }));

export default function ExpenseForm({ tenantId, branches, today }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: { branchId: branches[0]?.id ?? "", category: "RENT", amount: "", date: today, method: "CASH", paidTo: "", note: "" },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/expenses`, "POST", values);
      toast.success("Expense saved.");
      form.reset({ ...values, amount: "", paidTo: "", note: "" });
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Add expense</CardTitle>
        <CardDescription>Rent, salaries, bills and other running costs. Stock purchases are not expenses; they are recorded under Purchases.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="branchId" label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} idPrefix="exp" />
            <FormField control={form.control} name="category" label="Category" options={CATEGORIES} idPrefix="exp" />
            <FormField control={form.control} name="amount" label="Amount (PKR)" inputMode="numeric" idPrefix="exp" />
            <FormField control={form.control} name="date" label="Date" type="date" idPrefix="exp" />
            <FormField control={form.control} name="method" label="Paid by" options={METHODS} idPrefix="exp" />
            <FormField control={form.control} name="paidTo" label="Paid to (optional)" idPrefix="exp" />
            <FormField control={form.control} name="note" label="Note (optional)" multiline idPrefix="exp" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save expense"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
