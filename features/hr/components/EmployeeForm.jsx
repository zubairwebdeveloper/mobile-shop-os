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

import { employeeSchema } from "@/lib/validations/hr";

/** Create (no `employee`) or edit a staff record. Linking a team member lets that person's sales be credited to this employee. */
export default function EmployeeForm({ tenantId, branches, members, employee, today }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const editing = Boolean(employee);
  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? "", phone: employee?.phone ?? "", designation: employee?.designation ?? "", branchId: employee?.branchId ?? branches[0]?.id ?? "",
      memberUid: employee?.memberUid ?? "", joinDate: employee?.joinDate ?? today, commissionPercent: employee ? String(employee.commissionBps / 100) : "0",
      monthlyTarget: employee?.monthlyTarget ? String(employee.monthlyTarget / 100) : "", status: employee?.status ?? "ACTIVE", note: employee?.note ?? "",
    },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      if (editing) await callApi(`/api/tenants/${tenantId}/employees/${employee.id}`, "PATCH", values);
      else await callApi(`/api/tenants/${tenantId}/employees`, "POST", values);
      toast.success(editing ? "Employee updated." : "Employee added.");
      if (!editing) form.reset({ ...values, name: "", phone: "", designation: "", memberUid: "", monthlyTarget: "", note: "" });
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">{editing ? "Edit employee" : "Add employee"}</CardTitle>
        <CardDescription>Staff record only; sign-in and permissions are managed in Team. No salary is stored. Commission is a percentage of net sales (after returns, without tax).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="name" label="Name" idPrefix="emp" />
            <FormField control={form.control} name="phone" label="Phone (optional)" idPrefix="emp" />
            <FormField control={form.control} name="designation" label="Designation (optional)" idPrefix="emp" />
            <FormField control={form.control} name="branchId" label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} idPrefix="emp" />
            <FormField control={form.control} name="memberUid" label="Linked team account" options={[{ value: "", label: "Not linked" }, ...members.map((m) => ({ value: m.uid, label: `${m.name} (${m.role.toLowerCase()})` }))]} idPrefix="emp" />
            <FormField control={form.control} name="joinDate" label="Join date" type="date" idPrefix="emp" />
            <FormField control={form.control} name="commissionPercent" label="Commission (% of net sales)" inputMode="decimal" idPrefix="emp" />
            <FormField control={form.control} name="monthlyTarget" label="Monthly sales target (PKR, optional)" inputMode="numeric" idPrefix="emp" />
            {editing ? <FormField control={form.control} name="status" label="Status" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} idPrefix="emp" /> : null}
            <FormField control={form.control} name="note" label="Note (optional)" multiline idPrefix="emp" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : editing ? "Save changes" : "Add employee"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
