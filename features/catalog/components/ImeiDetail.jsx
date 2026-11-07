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
import { formatUtc } from "@/lib/formatters/date";
import { IMEI_STATUSES, imeiUpdateSchema } from "@/lib/validations/catalog";
import { callApi } from "../api";

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "USED", label: "Used" },
  { value: "REFURBISHED", label: "Refurbished" },
];
const label = (s) => s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function describe(event) {
  if (event.type === "REGISTERED") return "Registered";
  const d = event.detail ?? {};
  const parts = [];
  if (d.fromStatus !== d.toStatus) parts.push(`status ${label(d.fromStatus)} to ${label(d.toStatus)}`);
  if (d.fromBranchId !== d.toBranchId) parts.push("moved branch");
  if (d.fromCondition !== d.toCondition) parts.push(`condition ${label(d.fromCondition)} to ${label(d.toCondition)}`);
  return parts.length ? `Changed: ${parts.join(", ")}` : "Details edited";
}

export default function ImeiDetail({ tenantId, record, branches, canEdit }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const editable = canEdit && IMEI_STATUSES.includes(record.status);

  const form = useForm({
    resolver: zodResolver(imeiUpdateSchema),
    defaultValues: {
      status: record.status, condition: record.condition, branchId: record.branchId,
      serialNumber: record.serialNumber, notes: record.notes,
    },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/imei/${record.id}`, "PATCH", values);
      toast.success("Device updated.");
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  const statusOptions = IMEI_STATUSES.map((s) => ({ value: s, label: label(s) }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Device</CardTitle>
          <CardDescription>{record.productName} · {record.variantLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">IMEI 1</dt><dd className="font-mono font-medium">{record.imei1}</dd></div>
            <div><dt className="text-muted-foreground">IMEI 2</dt><dd className="font-mono font-medium">{record.imei2 || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{label(record.status)}</dd></div>
            <div><dt className="text-muted-foreground">Branch</dt><dd className="font-medium">{record.branchName}</dd></div>
            <div><dt className="text-muted-foreground">Registered</dt><dd className="font-medium">{formatUtc(record.createdAt)}</dd></div>
          </dl>
          <h3 className="mb-2 mt-6 text-sm font-medium">History</h3>
          <ul className="space-y-1 text-sm">
            {record.events.map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span>{describe(e)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{formatUtc(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Update</CardTitle>
          <CardDescription>
            {editable ? "Status, condition, branch and notes." : "This device's status is managed by sales and returns, or you do not have permission to edit it."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <FormField control={form.control} name="status" label="Status" options={statusOptions} disabled={!editable} idPrefix="device" />
              <FormField control={form.control} name="condition" label="Condition" options={CONDITIONS} disabled={!editable} idPrefix="device" />
              <FormField control={form.control} name="branchId" label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} disabled={!editable} idPrefix="device" />
              <FormField control={form.control} name="serialNumber" label="Serial number" disabled={!editable} idPrefix="device" />
              <FormField control={form.control} name="notes" label="Notes" multiline disabled={!editable} idPrefix="device" />
              {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
              {editable ? (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
