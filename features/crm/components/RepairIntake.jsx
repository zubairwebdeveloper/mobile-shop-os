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
import { repairCreateSchema } from "@/lib/validations/crm";
import { callApi } from "@/features/inventory/api";

export default function RepairIntake({ tenantId, branches, prefill = {} }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(repairCreateSchema),
    defaultValues: { branchId: branches[0]?.id ?? "", customerName: prefill.customerName ?? "", customerPhone: prefill.customerPhone ?? "", deviceBrand: prefill.deviceBrand ?? "", deviceModel: prefill.deviceModel ?? "", imei: prefill.imei ?? "", issue: "", accessories: "", estimatedCost: "0" },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      const r = await callApi(`/api/tenants/${tenantId}/repairs`, "POST", { ...values, ...(prefill.customerId ? { customerId: prefill.customerId } : {}), ...(prefill.warrantyId ? { warrantyId: prefill.warrantyId } : {}) });
      toast.success("Repair job created.");
      router.push(`/dashboard/repairs/${r.id}`);
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="font-heading text-lg">New repair job</CardTitle>
        <CardDescription>{prefill.warrantyId ? "This job is linked to a warranty and will be free of charge." : "Start a warranty repair from the warranty page."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {branches.length > 1 ? <FormField control={form.control} name="branchId" label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} idPrefix="rep" /> : null}
            <FormField control={form.control} name="customerName" label="Customer name" idPrefix="rep" />
            <FormField control={form.control} name="customerPhone" label="Customer phone" inputMode="tel" idPrefix="rep" />
            <FormField control={form.control} name="deviceBrand" label="Brand" idPrefix="rep" />
            <FormField control={form.control} name="deviceModel" label="Model" idPrefix="rep" />
            <FormField control={form.control} name="imei" label="IMEI (optional)" inputMode="numeric" idPrefix="rep" />
            <FormField control={form.control} name="issue" label="Problem" multiline idPrefix="rep" />
            <FormField control={form.control} name="accessories" label="Accessories left with the shop" idPrefix="rep" />
            <FormField control={form.control} name="estimatedCost" label="Estimate (PKR)" inputMode="numeric" idPrefix="rep" />
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Create job"}</Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
