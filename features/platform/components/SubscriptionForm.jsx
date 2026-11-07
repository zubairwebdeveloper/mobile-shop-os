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
import { subscriptionSchema } from "@/lib/validations/platform";

const STATUS_OPTIONS = [
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAST_DUE", label: "Past due" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function SubscriptionForm({ tenantId, currentPlanId, currentStatus, currentRenewsAt, plans }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);

  const planOptions = plans
    .filter((plan) => plan.status === "ACTIVE" || plan.id === currentPlanId)
    .map((plan) => ({ value: plan.id, label: plan.status === "ACTIVE" ? plan.name : `${plan.name} (archived)` }));
  if (currentPlanId && !planOptions.some((option) => option.value === currentPlanId)) {
    planOptions.unshift({ value: currentPlanId, label: `${currentPlanId} (no plan record)` });
  }

  const form = useForm({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      planId: currentPlanId ?? planOptions[0]?.value ?? "",
      status: currentStatus ?? "TRIAL",
      renewsAt: currentRenewsAt ? currentRenewsAt.slice(0, 10) : "",
      note: "",
    },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      const response = await fetch(`/api/platform/tenants/${tenantId}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(body?.error?.message ?? "The request failed. Please try again.");
        return;
      }
      toast.success("Subscription updated.");
      form.setValue("note", "");
      router.refresh();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Subscription</CardTitle>
        <CardDescription>
          Manual billing: choose the plan and status. Saving copies the plan&apos;s limits onto the shop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {planOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create a plan first (Plans page).</p>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <FormField control={form.control} name="planId" label="Plan" options={planOptions} idPrefix="sub" />
              <FormField control={form.control} name="status" label="Status" options={STATUS_OPTIONS} idPrefix="sub" />
              <FormField
                control={form.control}
                name="renewsAt"
                label="Renewal date"
                type="date"
                description="Optional."
                idPrefix="sub"
              />
              <FormField control={form.control} name="note" label="Note (kept in history)" multiline idPrefix="sub" />
              {formError ? (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              ) : null}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save subscription"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
