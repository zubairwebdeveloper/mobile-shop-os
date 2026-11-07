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
import { callApi, newKey } from "@/features/inventory/api";

import { formatPkr } from "@/lib/formatters/money";
import { collectSchema } from "@/lib/validations/finance";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer (record)" },
  { value: "JAZZCASH", label: "JazzCash (record)" },
  { value: "EASYPAISA", label: "Easypaisa (record)" },
];
const schema = collectSchema.pick({ amount: true, method: true, reference: true });

/** Records money received against a balance. A retry after a network error reuses the same key, so it can never record twice. */
export default function CollectForm({ tenantId, targetType, targetId, due }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const [key, setKey] = useState(() => newKey());
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { amount: String(Math.floor(due / 100)), method: "CASH", reference: "" } });

  async function onSubmit(values) {
    setFormError(null);
    try {
      const r = await callApi(`/api/tenants/${tenantId}/payments`, "POST", { ...values, paymentKey: key, targetType, targetId });
      setKey(newKey());
      toast.success("Payment recorded.");
      router.push(`/dashboard/receipts/${r.id}`);
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card className="max-w-xl print:hidden">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Collect payment</CardTitle>
        <CardDescription>Balance due {formatPkr(due)}. This records money you received; it does not move money through any bank or wallet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="amount" label="Amount (PKR)" inputMode="numeric" idPrefix="collect" />
            <FormField control={form.control} name="method" label="Received by" options={METHODS} idPrefix="collect" />
            <FormField control={form.control} name="reference" label="Reference (optional)" idPrefix="collect" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Record payment"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
