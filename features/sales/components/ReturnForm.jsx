"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import CheckboxField from "@/components/forms/CheckboxField";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { formatPkr } from "@/lib/formatters/money";
import { refundForUnits } from "@/lib/sales/pure";
import { callApi, newKey } from "@/features/inventory/api";

const REASONS = [
  { value: "DEFECTIVE", label: "Defective" },
  { value: "WRONG_ITEM", label: "Wrong item" },
  { value: "CUSTOMER_CHANGED_MIND", label: "Customer changed mind" },
  { value: "OTHER", label: "Other" },
];
const METHODS = [
  { value: "CASH", label: "Cash refund" },
  { value: "BANK_TRANSFER", label: "Bank transfer (record)" },
  { value: "JAZZCASH", label: "JazzCash (record)" },
  { value: "EASYPAISA", label: "Easypaisa (record)" },
  { value: "EXCHANGE_CREDIT", label: "Exchange credit (for a new sale)" },
];

/** Return / exchange form for owners and managers. Choosing "Exchange credit" is how an exchange starts: the credit is spent as a payment in the POS. */
export default function ReturnForm({ tenantId, sale }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const [key, setKey] = useState(() => newKey());
  const open = sale.items.filter((i) => i.quantity - i.returnedQty > 0);
  const [imeiPick, setImeiPick] = useState({});

  const form = useForm({
    defaultValues: {
      reason: "DEFECTIVE", refundMethod: "CASH", reference: "", note: "",
      items: open.map((i) => ({ variantId: i.variantId, quantity: "0", restock: true })),
    },
  });
  const rows = form.watch("items");

  const picked = (i) => imeiPick[i.variantId] ?? [];
  const qtyOf = (i, idx) => (i.imeis.length > 0 ? picked(i).length : Math.max(0, Number(rows[idx]?.quantity) || 0));
  const estimate = open.reduce((sum, i, idx) => {
    const q = qtyOf(i, idx);
    return q > 0 && q <= i.quantity - i.returnedQty ? sum + refundForUnits(i, q) : sum;
  }, 0);

  async function onSubmit(values) {
    setFormError(null);
    const items = open
      .map((i, idx) => ({ variantId: i.variantId, quantity: qtyOf(i, idx), restock: values.items[idx].restock, imeis: i.imeis.length > 0 ? picked(i) : [] }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) return void setFormError("Choose at least one item to return.");
    try {
      await callApi(`/api/tenants/${tenantId}/returns`, "POST", {
        returnKey: key, saleId: sale.id, reason: values.reason, note: values.note, refundMethod: values.refundMethod, reference: values.reference, items,
      });
      toast.success("Return recorded.");
      setKey(newKey());
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (open.length === 0) return null;

  return (
    <Card className="max-w-2xl print:hidden">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Return or exchange</CardTitle>
        <CardDescription>The refund is worked out from what the customer actually paid for each item. This records the refund; it does not send money.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {open.map((i, idx) => (
              <fieldset key={i.variantId} className="space-y-2 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">{i.productName} · {i.variantLabel} (up to {i.quantity - i.returnedQty})</legend>
                {i.imeis.length > 0 ? (
                  i.returnableImeis.map((n) => (
                    <label key={n} className="flex min-h-9 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={picked(i).includes(n)}
                        onChange={() => setImeiPick((p) => ({ ...p, [i.variantId]: picked(i).includes(n) ? picked(i).filter((x) => x !== n) : [...picked(i), n] }))}
                      />
                      <span className="tabular-nums">{n}</span>
                    </label>
                  ))
                ) : (
                  <FormField control={form.control} name={`items.${idx}.quantity`} label="Quantity to return" type="number" idPrefix="ret" />
                )}
                <CheckboxField control={form.control} name={`items.${idx}.restock`} label="Put back in stock" description="Untick if damaged; devices are then marked Damaged." idPrefix="ret" />
              </fieldset>
            ))}
            <FormField control={form.control} name="reason" label="Reason" options={REASONS} idPrefix="ret" />
            <FormField control={form.control} name="refundMethod" label="Refund as" options={METHODS} idPrefix="ret" />
            <FormField control={form.control} name="reference" label="Reference (optional)" idPrefix="ret" />
            <FormField control={form.control} name="note" label="Note" multiline idPrefix="ret" />
            <p className="text-sm tabular-nums">Refund: <span className="font-semibold">{formatPkr(estimate)}</span>{sale.dueAmount > 0 ? ` (any unpaid balance, up to ${formatPkr(sale.dueAmount)}, is cancelled first)` : ""}</p>
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Record return"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
