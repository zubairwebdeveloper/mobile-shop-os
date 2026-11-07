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

import { leaveRequestSchema } from "@/lib/validations/hr";

const TYPES = ["ANNUAL", "SICK", "CASUAL", "UNPAID", "OTHER"].map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }));

export default function LeaveForm({ tenantId, employees, today }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({ resolver: zodResolver(leaveRequestSchema), defaultValues: { employeeId: employees[0]?.id ?? "", type: "CASUAL", from: today, to: today, reason: "" } });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/leave`, "POST", values);
      toast.success("Leave request saved.");
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="font-heading text-lg">New leave request</CardTitle><CardDescription>Entered on the employee's behalf. Approve it from the list.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="employeeId" label="Employee" options={employees.map((e) => ({ value: e.id, label: e.name }))} idPrefix="lv" />
            <FormField control={form.control} name="type" label="Type" options={TYPES} idPrefix="lv" />
            <FormField control={form.control} name="from" label="From" type="date" idPrefix="lv" />
            <FormField control={form.control} name="to" label="To" type="date" idPrefix="lv" />
            <FormField control={form.control} name="reason" label="Reason (optional)" multiline idPrefix="lv" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save request"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
