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
import { branchSchema } from "@/lib/validations/onboarding";

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

function BranchForm({ idPrefix, defaultValues, submitLabel, onSubmit, onCancel }) {
  const form = useForm({ resolver: zodResolver(branchSchema), defaultValues });

  async function submit(values) {
    const saved = await onSubmit(values);
    if (saved) form.reset(defaultValues);
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="name" label="Branch name" idPrefix={idPrefix} />
        <FormField control={form.control} name="address" label="Address" multiline idPrefix={idPrefix} />
        <FormField control={form.control} name="phone" label="Phone" type="tel" inputMode="tel" idPrefix={idPrefix} />
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : submitLabel}
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

export default function BranchManager({ tenantId, branches, canManage, used, max }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);
  const atLimit = typeof max === "number" && used >= max;
  const base = `/api/tenants/${tenantId}/branches`;

  async function createBranch(values) {
    try {
      await callApi(base, "POST", values);
      toast.success("Branch created.");
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }

  async function updateBranch(branchId, values) {
    try {
      await callApi(`${base}/${branchId}`, "PATCH", values);
      toast.success("Branch updated.");
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
      <section aria-label="Branches" className="space-y-4">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-heading text-lg">{branch.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {branch.isMain ? <StatusBadge status="ACTIVE" tone="info" className="uppercase" /> : null}
                  <StatusBadge status={branch.active ? "ACTIVE" : "SUSPENDED"} />
                </div>
              </div>
              {editingId !== branch.id ? (
                <CardDescription>
                  {[branch.address, branch.phone].filter(Boolean).join(" · ") || "No address or phone yet"}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {editingId === branch.id ? (
                <BranchForm
                  idPrefix={`edit-${branch.id}`}
                  defaultValues={{ name: branch.name, address: branch.address, phone: branch.phone }}
                  submitLabel="Save changes"
                  onSubmit={(values) => updateBranch(branch.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : canManage ? (
                <Button variant="outline" size="sm" onClick={() => setEditingId(branch.id)}>
                  Edit
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </section>

      {canManage ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Add a branch</CardTitle>
            <CardDescription>
              {typeof max === "number" ? `${used} of ${max} branches used on your plan.` : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {atLimit ? (
              <p role="status" className="text-sm text-muted-foreground">
                You have reached your plan&apos;s branch limit.
              </p>
            ) : (
              <BranchForm
                idPrefix="new-branch"
                defaultValues={{ name: "", address: "", phone: "" }}
                submitLabel="Create branch"
                onSubmit={createBranch}
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
