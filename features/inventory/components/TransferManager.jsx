"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatUtc } from "@/lib/formatters/date";
import { parseImeiLines } from "@/lib/inventory/pure";
import { callApi } from "../api";

const TONE = { IN_TRANSIT: "warning", RECEIVED: "success", CANCELLED: "neutral" };

function NewTransfer({ tenantId, branches, myBranchIds, canSeeAll, variants }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const [imeiText, setImeiText] = useState({});
  const sources = canSeeAll ? branches : branches.filter((b) => myBranchIds.includes(b.id));
  const options = variants.map((v) => ({ value: v.id, label: `${v.productName} (${v.variantLabel})${v.tracksImei ? " · IMEI" : ""}` }));
  const tracked = Object.fromEntries(variants.map((v) => [v.id, v.tracksImei]));

  const form = useForm({
    defaultValues: {
      fromBranchId: sources[0]?.id ?? "",
      toBranchId: branches.find((b) => b.id !== sources[0]?.id)?.id ?? "",
      note: "",
      items: [{ variantId: variants[0]?.id ?? "", quantity: "1" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");

  async function onSubmit(values) {
    setFormError(null);
    const payload = {
      fromBranchId: values.fromBranchId,
      toBranchId: values.toBranchId,
      note: values.note,
      items: values.items.map((item, i) => ({
        variantId: item.variantId,
        quantity: Number(item.quantity),
        imeis: tracked[item.variantId] ? parseImeiLines(imeiText[i]).map((e) => e.imei1) : [],
      })),
    };
    try {
      await callApi(`/api/tenants/${tenantId}/transfers`, "POST", payload);
      toast.success("Transfer created. Stock has left the source branch.");
      form.reset({ ...values, items: [{ variantId: variants[0]?.id ?? "", quantity: "1" }] });
      setImeiText({});
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (branches.length < 2 || variants.length === 0 || sources.length === 0) {
    return (
      <Card className="h-fit">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Transfers need at least two branches, a branch you can send from, and an active product.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="font-heading text-lg">New transfer</CardTitle>
        <CardDescription>Stock leaves the source now and is added at the destination when received there.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="fromBranchId" label="From" options={sources.map((b) => ({ value: b.id, label: b.name }))} idPrefix="tr" />
            <FormField control={form.control} name="toBranchId" label="To" options={branches.map((b) => ({ value: b.id, label: b.name }))} idPrefix="tr" />
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2 rounded-lg border p-3">
                <FormField control={form.control} name={`items.${index}.variantId`} label="Product" options={options} idPrefix="tr" />
                <FormField control={form.control} name={`items.${index}.quantity`} label="Quantity" type="number" idPrefix="tr" />
                {tracked[items[index]?.variantId] ? (
                  <div>
                    <label htmlFor={`tr-imei-${index}`} className="mb-1 block text-xs text-muted-foreground">IMEIs, one per line</label>
                    <Textarea id={`tr-imei-${index}`} rows={3} value={imeiText[index] ?? ""} onChange={(e) => setImeiText((t) => ({ ...t, [index]: e.target.value }))} className="font-mono text-xs" />
                  </div>
                ) : null}
                <Button type="button" size="sm" variant="outline" onClick={() => remove(index)} disabled={fields.length === 1}>Remove</Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => append({ variantId: variants[0].id, quantity: "1" })}>Add item</Button>
            <FormField control={form.control} name="note" label="Note" idPrefix="tr" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating..." : "Send transfer"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

export default function TransferManager({ tenantId, transfers, branches, myBranchIds, canSeeAll, variants, canManage }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const mine = (id) => canSeeAll || myBranchIds.includes(id);

  async function act(id, action) {
    setBusyId(id);
    try {
      await callApi(`/api/tenants/${tenantId}/transfers/${id}`, "PATCH", { action });
      toast.success(action === "RECEIVE" ? "Transfer received." : "Transfer cancelled and stock returned.");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section aria-label="Transfers" className="space-y-4">
        {transfers.length === 0 ? <EmptyState title="No transfers yet" description="Move stock between your branches here." /> : null}
        {transfers.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-heading text-lg">{t.fromBranchName} to {t.toBranchName}</CardTitle>
                <StatusBadge status={t.status} tone={TONE[t.status]} />
              </div>
              <CardDescription>{formatUtc(t.createdAt)}{t.note ? ` · ${t.note}` : ""}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-sm">
                {t.items.map((i) => (
                  <li key={i.variantId}>{i.quantity} × {i.productName} <span className="text-muted-foreground">({i.variantLabel}){i.imeiCount ? ` · ${i.imeiCount} devices` : ""}</span></li>
                ))}
              </ul>
              {canManage && t.status === "IN_TRANSIT" ? (
                <div className="flex gap-2">
                  {mine(t.toBranchId) ? <Button size="sm" onClick={() => act(t.id, "RECEIVE")} disabled={busyId === t.id}>Receive</Button> : null}
                  {mine(t.fromBranchId) ? <Button size="sm" variant="outline" onClick={() => act(t.id, "CANCEL")} disabled={busyId === t.id}>Cancel and return</Button> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>
      {canManage ? <NewTransfer tenantId={tenantId} branches={branches} myBranchIds={myBranchIds} canSeeAll={canSeeAll} variants={variants} /> : null}
    </div>
  );
}
