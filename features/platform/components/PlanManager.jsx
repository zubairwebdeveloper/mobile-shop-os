"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { planToFormValues } from "@/lib/platform/subscription";
import { planCreateSchema, planUpdateSchema } from "@/lib/validations/platform";

const VISIBILITY = [
  { value: "HIDDEN", label: "Hidden (not on the pricing page)" },
  { value: "PUBLIC", label: "Public (shown on the pricing page)" },
];
const STATUS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived (cannot be assigned)" },
];

const EMPTY = {
  id: "",
  name: "",
  description: "",
  priceMonthlyPkr: "",
  maxBranches: "1",
  maxEmployees: "5",
  aiRequestsPerMonth: "0",
  features: "",
  visibility: "HIDDEN",
  status: "ACTIVE",
  sortOrder: "0",
};

async function callApi(url, method, payload) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request failed. Please try again.");
  return body;
}

function PlanForm({ mode, defaultValues, onSubmit, onCancel, idPrefix }) {
  const form = useForm({
    resolver: zodResolver(mode === "create" ? planCreateSchema : planUpdateSchema),
    defaultValues,
  });

  async function submit(values) {
    const saved = await onSubmit(values);
    if (saved && mode === "create") form.reset(EMPTY);
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        {mode === "create" ? (
          <FormField
            control={form.control}
            name="id"
            label="Plan ID"
            description="Lowercase, e.g. starter. Cannot be changed later."
            idPrefix={idPrefix}
          />
        ) : null}
        <FormField control={form.control} name="name" label="Name" idPrefix={idPrefix} />
        <FormField control={form.control} name="description" label="Short description" idPrefix={idPrefix} />
        <FormField
          control={form.control}
          name="priceMonthlyPkr"
          label="Monthly price (PKR)"
          inputMode="numeric"
          description="Whole rupees. Leave empty to show 'contact us'."
          idPrefix={idPrefix}
        />
        <FormField control={form.control} name="maxBranches" label="Branch limit" type="number" idPrefix={idPrefix} />
        <FormField control={form.control} name="maxEmployees" label="Employee limit" type="number" idPrefix={idPrefix} />
        <FormField
          control={form.control}
          name="aiRequestsPerMonth"
          label="AI requests per month"
          type="number"
          idPrefix={idPrefix}
        />
        <FormField
          control={form.control}
          name="features"
          label="Feature list"
          description="One feature per line (shown on the pricing page)."
          multiline
          idPrefix={idPrefix}
        />
        <FormField control={form.control} name="visibility" label="Visibility" options={VISIBILITY} idPrefix={idPrefix} />
        <FormField control={form.control} name="status" label="Status" options={STATUS} idPrefix={idPrefix} />
        <FormField control={form.control} name="sortOrder" label="Display order" type="number" idPrefix={idPrefix} />
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : mode === "create" ? "Create plan" : "Save plan"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}

function priceLabel(plan) {
  if (plan.priceMonthly == null) return "Contact us";
  return `PKR ${(plan.priceMonthly / 100).toLocaleString("en-US")} / month`;
}

export default function PlanManager({ plans }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);

  async function create(values) {
    try {
      await callApi("/api/platform/plans", "POST", values);
      toast.success("Plan created.");
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }

  async function update(planId, values) {
    try {
      await callApi(`/api/platform/plans/${planId}`, "PATCH", values);
      toast.success("Plan saved. Shops keep their current limits until their subscription is re-saved.");
      setEditingId(null);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section aria-label="Plans" className="space-y-4">
        {plans.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No plans yet. Create the first one on the right (for example Starter).
          </p>
        ) : null}
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-heading text-lg">{plan.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {plan.isPlaceholder ? <StatusBadge status="PENDING" tone="warning" className="uppercase" /> : null}
                  <StatusBadge status={plan.status} tone={plan.status === "ACTIVE" ? "success" : "neutral"} />
                  <StatusBadge status={plan.isPublic ? "PUBLIC" : "HIDDEN"} tone="neutral" />
                </div>
              </div>
              <CardDescription>
                {plan.id} · {priceLabel(plan)}
                {plan.isPlaceholder ? " · placeholder values, review before use" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingId === plan.id ? (
                <PlanForm
                  mode="edit"
                  idPrefix={`edit-${plan.id}`}
                  defaultValues={planToFormValues(plan)}
                  onSubmit={(values) => update(plan.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {plan.limits.maxBranches} branches · {plan.limits.maxEmployees} employees · {plan.limits.aiRequestsPerMonth} AI
                    requests / month
                  </p>
                  {plan.features.length > 0 ? (
                    <ul className="list-disc ps-5">
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => setEditingId(plan.id)}>
                    Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="font-heading text-lg">New plan</CardTitle>
          <CardDescription>Pricing and limits are data, so they can change without a deploy.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanForm mode="create" idPrefix="new-plan" defaultValues={EMPTY} onSubmit={create} />
        </CardContent>
      </Card>
    </div>
  );
}
