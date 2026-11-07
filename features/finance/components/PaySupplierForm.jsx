"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";

import { FieldGroup } from "@/components/ui/field";
import { callApi, newKey } from "@/features/inventory/api";

import { formatPkr } from "@/lib/formatters/money";
import { supplierPaymentSchema } from "@/lib/validations/finance";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer (record)" },
  { value: "JAZZCASH", label: "JazzCash (record)" },
  { value: "EASYPAISA", label: "Easypaisa (record)" },
];
const schema = supplierPaymentSchema.pick({ amount: true, method: true, reference: true });

export default function PaySupplierForm({ tenantId, purchaseId, payable }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [key, setKey] = useState(() => newKey());
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { amount: String(Math.floor(payable / 100)), method: "BANK_TRANSFER", reference: "" } });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/supplier-payments`, "POST", { ...values, paymentKey: key, purchaseId });
      setKey(newKey());
      toast.success("Supplier payment recorded.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (!open) return <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>Record payment</Button>;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-2 w-full max-w-sm">
      <p className="mb-2 text-xs text-muted-foreground">Owed {formatPkr(payable)}. This records a payment you made; the app does not send money.</p>
      <FieldGroup>
        <FormField control={form.control} name="amount" label="Amount (PKR)" inputMode="numeric" idPrefix={`sp-${purchaseId}`} />
        <FormField control={form.control} name="method" label="Paid by" options={METHODS} idPrefix={`sp-${purchaseId}`} />
        <FormField control={form.control} name="reference" label="Reference (optional)" idPrefix={`sp-${purchaseId}`} />
        {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>Save</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </FieldGroup>
    </form>
  );
}
