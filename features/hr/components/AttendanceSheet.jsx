"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { callApi } from "@/features/inventory/api";

const STATUS = [
  { value: "", label: "Not marked" }, { value: "PRESENT", label: "Present" }, { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half day" }, { value: "ABSENT", label: "Absent" }, { value: "LEAVE", label: "On leave" },
];

/** Marks one branch and day. Rows left as "Not marked" are not saved; re-saving a day corrects it. */
export default function AttendanceSheet({ tenantId, branchId, date, rows }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({ defaultValues: { entries: rows.map((r) => ({ status: r.status ?? (r.onApprovedLeave ? "LEAVE" : ""), note: r.note ?? "" })) } });

  async function onSubmit(values) {
    setFormError(null);
    const entries = rows.map((r, i) => ({ employeeId: r.id, status: values.entries[i].status, note: values.entries[i].note })).filter((e) => e.status);
    if (entries.length === 0) return void setFormError("Mark at least one person.");
    try {
      await callApi(`/api/tenants/${tenantId}/attendance`, "POST", { branchId, date, entries });
      toast.success("Attendance saved.");
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No active employees in this branch on that date. Add staff under Employees.</p>;
  return (
    <Card>
      <CardHeader><CardTitle className="font-heading text-lg">Attendance for {date}</CardTitle><CardDescription>People with approved leave are pre-set to "On leave"; change it if they came in.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {rows.map((r, i) => (
              <div key={r.id} className="grid gap-2 sm:grid-cols-[1fr_160px_1fr] sm:items-end">
                <p className="text-sm font-medium">{r.name}<span className="block text-xs font-normal text-muted-foreground">{r.designation}</span></p>
                <FormField control={form.control} name={`entries.${i}.status`} label="Status" options={STATUS} idPrefix={`att-${r.id}`} />
                <FormField control={form.control} name={`entries.${i}.note`} label="Note" idPrefix={`att-${r.id}`} />
              </div>
            ))}
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save attendance"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
