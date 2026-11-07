"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { formatUtc } from "@/lib/formatters/date";
import { formatPkr } from "@/lib/formatters/money";
import { REPAIR_TRANSITIONS } from "@/lib/customers/pure";
import { callApi } from "@/features/inventory/api";

const label = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const TONE = { RECEIVED: "info", DIAGNOSING: "info", WAITING_FOR_PARTS: "warning", IN_PROGRESS: "info", READY: "success", DELIVERED: "success", CANCELLED: "danger" };
const METHODS = [{ value: "CASH", label: "Cash" }, { value: "BANK_TRANSFER", label: "Bank transfer (record)" }, { value: "JAZZCASH", label: "JazzCash (record)" }, { value: "EASYPAISA", label: "Easypaisa (record)" }];
const toRupees = (paisa) => String(Math.round((paisa ?? 0) / 100));

export default function RepairDetail({ tenantId, repair, technicians, partOptions, canWrite }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const finished = repair.status === "DELIVERED" || repair.status === "CANCELLED";
  const editable = canWrite && !finished;
  const partsEditable = editable && ["DIAGNOSING", "WAITING_FOR_PARTS", "IN_PROGRESS"].includes(repair.status);
  const next = REPAIR_TRANSITIONS[repair.status] ?? [];

  const details = useForm({ defaultValues: { estimatedCost: toRupees(repair.estimatedCost), labourCharge: toRupees(repair.labourCharge), diagnosis: repair.diagnosis, technicianUid: repair.technicianUid } });
  const part = useForm({ defaultValues: { variantId: partOptions[0]?.value ?? "", quantity: "1", unitPrice: "0" } });
  const deliver = useForm({ defaultValues: { collected: "0", method: "CASH", note: "" } });
  const note = useForm({ defaultValues: { note: "" } });

  async function run(body, message) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/repairs/${repair.id}`, "POST", body);
      toast.success(message);
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-heading text-lg">{repair.deviceBrand} {repair.deviceModel}</CardTitle>
            <StatusBadge status={label(repair.status)} tone={TONE[repair.status] ?? "neutral"} />
          </div>
          <CardDescription>{repair.customerName || "No customer name"}{repair.customerPhone ? ` · ${repair.customerPhone}` : ""}{repair.underWarranty ? " · under warranty (free)" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Problem:</span> {repair.issue}</p>
          {repair.imei ? <p className="tabular-nums"><span className="text-muted-foreground">IMEI:</span> {repair.imei}</p> : null}
          {repair.accessories ? <p><span className="text-muted-foreground">Left with us:</span> {repair.accessories}</p> : null}
          {repair.technicianName ? <p><span className="text-muted-foreground">Technician:</span> {repair.technicianName}</p> : null}
          <p className="tabular-nums"><span className="text-muted-foreground">Estimate:</span> {formatPkr(repair.estimatedCost)} · <span className="text-muted-foreground">Labour:</span> {formatPkr(repair.labourCharge)} · <span className="text-muted-foreground">Parts:</span> {formatPkr(repair.partsTotal)} · <span className="font-medium">Total {formatPkr(repair.total)}</span></p>
          {repair.status === "DELIVERED" ? <p className="tabular-nums">Final cost {formatPkr(repair.finalCost)} · collected {formatPkr(repair.collected)}{repair.dueAmount > 0 ? ` · balance due ${formatPkr(repair.dueAmount)}` : ""}</p> : null}
          <ol className="mt-3 space-y-1 border-t pt-3">
            {repair.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-2"><span>{label(h.status)}{h.note ? <span className="text-muted-foreground"> · {h.note}</span> : null}</span><span className="tabular-nums text-xs text-muted-foreground">{formatUtc(h.at)}</span></li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}

        {editable ? (
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Details</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={details.handleSubmit((v) => run({ action: "UPDATE", ...v }, "Saved."))} noValidate>
                <FieldGroup>
                  <FormField control={details.control} name="diagnosis" label="Diagnosis" multiline idPrefix="rd" />
                  <FormField control={details.control} name="estimatedCost" label="Estimate (PKR)" inputMode="numeric" idPrefix="rd" />
                  <FormField control={details.control} name="labourCharge" label="Labour charge (PKR)" inputMode="numeric" idPrefix="rd" />
                  <FormField control={details.control} name="technicianUid" label="Technician" options={[{ value: "", label: "Unassigned" }, ...technicians.map((t) => ({ value: t.uid, label: `${t.name} (${label(t.role)})` }))]} idPrefix="rd" />
                  <Button type="submit" disabled={details.formState.isSubmitting}>Save details</Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">Parts used</CardTitle><CardDescription>Parts leave stock when added and return if removed or the job is cancelled.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {repair.parts.length === 0 ? <p className="text-sm text-muted-foreground">No parts yet.</p> : null}
            {repair.parts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{p.productName} <span className="text-muted-foreground">({p.variantLabel}) × {p.quantity}</span></span>
                <span className="flex items-center gap-2 tabular-nums">{formatPkr(p.unitPrice * p.quantity)}{partsEditable ? <Button type="button" size="sm" variant="outline" onClick={() => run({ action: "REMOVE_PART", partId: p.id }, "Part removed.")}>Remove</Button> : null}</span>
              </div>
            ))}
            {partsEditable && partOptions.length > 0 ? (
              <form onSubmit={part.handleSubmit((v) => run({ action: "ADD_PART", variantId: v.variantId, quantity: Number(v.quantity), unitPrice: v.unitPrice }, "Part added."))} noValidate>
                <FieldGroup>
                  <FormField control={part.control} name="variantId" label="Part" options={partOptions} idPrefix="rp" />
                  <FormField control={part.control} name="quantity" label="Quantity" type="number" idPrefix="rp" />
                  <FormField control={part.control} name="unitPrice" label="Price charged per unit (PKR)" inputMode="numeric" idPrefix="rp" />
                  <Button type="submit" disabled={part.formState.isSubmitting}>Add part</Button>
                </FieldGroup>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {editable && next.length > 0 ? (
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Move job</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {next.filter((s) => s !== "DELIVERED").map((s) => (
                <Button key={s} type="button" variant={s === "CANCELLED" ? "outline" : "default"} className="me-2" onClick={() => run({ action: "STATUS", status: s, note: note.getValues("note") }, `Job is now ${label(s).toLowerCase()}.`)}>{s === "CANCELLED" ? "Cancel job" : label(s)}</Button>
              ))}
              <FormField control={note.control} name="note" label="Note for the history (optional)" idPrefix="rn" />
              {next.includes("DELIVERED") ? (
                <form onSubmit={deliver.handleSubmit((v) => run({ action: "STATUS", status: "DELIVERED", ...v }, "Delivered."))} noValidate className="border-t pt-4">
                  <FieldGroup>
                    <p className="text-sm font-medium">Hand over to customer · total {formatPkr(repair.underWarranty ? 0 : repair.total)}</p>
                    <FormField control={deliver.control} name="collected" label="Amount collected (PKR)" inputMode="numeric" description="Leave a balance only if a customer is linked." idPrefix="rdl" />
                    <FormField control={deliver.control} name="method" label="Paid by" options={METHODS} idPrefix="rdl" />
                    <Button type="submit" disabled={deliver.formState.isSubmitting}>Mark delivered</Button>
                  </FieldGroup>
                </form>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
