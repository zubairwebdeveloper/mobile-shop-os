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
import { reconcileSchema } from "@/lib/validations/finance";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer (record)" },
  { value: "JAZZCASH", label: "JazzCash (record)" },
  { value: "EASYPAISA", label: "Easypaisa (record)" },
];

/** Compares what our records say moved through one method with the total on the bank / wallet statement you type in. Nothing is imported from a bank. */
export default function ReconcileForm({ tenantId, branches, allBranches, from, to }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const [result, setResult] = useState(null);
  const form = useForm({
    resolver: zodResolver(reconcileSchema),
    defaultValues: { method: "BANK_TRANSFER", from, to, branchId: allBranches ? "" : branches[0]?.id ?? "", statementTotal: "", note: "" },
  });

  async function onSubmit(values) {
    setFormError(null);
    setResult(null);
    try {
      const payload = { ...values, branchId: values.branchId || undefined };
      setResult(await callApi(`/api/tenants/${tenantId}/reconciliations`, "POST", payload));
      toast.success("Reconciliation saved.");
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">New reconciliation</CardTitle>
        <CardDescription>Enter the net total from your statement for the period (money in minus money out, whole rupees). The difference is statement minus system.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="method" label="Account" options={METHODS} idPrefix="rec" />
            <FormField control={form.control} name="branchId" label="Branch" options={[...(allBranches ? [{ value: "", label: "All branches" }] : []), ...branches.map((b) => ({ value: b.id, label: b.name }))]} idPrefix="rec" />
            <FormField control={form.control} name="from" label="From" type="date" idPrefix="rec" />
            <FormField control={form.control} name="to" label="To" type="date" idPrefix="rec" />
            <FormField control={form.control} name="statementTotal" label="Statement net total (PKR)" inputMode="numeric" idPrefix="rec" />
            <FormField control={form.control} name="note" label="Note (optional)" multiline idPrefix="rec" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            {result ? <p role="status" className="text-sm tabular-nums">System {formatPkr(result.systemNet)} · statement {formatPkr(result.statementTotal)} · difference {result.difference === 0 ? "none" : formatPkr(result.difference)}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save reconciliation"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
