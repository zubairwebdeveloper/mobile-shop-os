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
import { callApi } from "@/features/inventory/api";

const TONE = { OPEN: "warning", APPROVED: "info", RESOLVED: "success", REJECTED: "danger" };

export default function WarrantyClaims({ tenantId, warranty, canLog, canDecide }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const claimForm = useForm({ defaultValues: { description: "" } });
  const voidForm = useForm({ defaultValues: { reason: "" } });
  const act = (body) => callApi(`/api/tenants/${tenantId}/warranties/${warranty.id}`, "POST", body);

  async function run(body, message) {
    setFormError(null);
    try {
      await act(body);
      toast.success(message);
      claimForm.reset();
      voidForm.reset();
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <div className="space-y-4 print:hidden">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Claims</CardTitle>
          <CardDescription>Problems reported under this warranty. A claim can only be logged while the warranty is active.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {warranty.claims.length === 0 ? <p className="text-sm text-muted-foreground">No claims yet.</p> : null}
          {warranty.claims.map((c) => (
            <div key={c.id} className="space-y-2 rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={c.status} tone={TONE[c.status] ?? "neutral"} />
                <span className="text-xs tabular-nums text-muted-foreground">{formatUtc(c.createdAt)}</span>
              </div>
              <p>{c.description}</p>
              {c.resolution ? <p className="text-muted-foreground">Outcome: {c.resolution}</p> : null}
              {canDecide && (c.status === "OPEN" || c.status === "APPROVED") ? (
                <div className="flex flex-wrap gap-2">
                  {c.status === "OPEN" ? <Button type="button" size="sm" variant="outline" onClick={() => run({ action: "CLAIM_UPDATE", claimId: c.id, status: "APPROVED", resolution: "" }, "Claim approved.")}>Approve</Button> : null}
                  {c.status === "OPEN" ? <Button type="button" size="sm" variant="outline" onClick={() => run({ action: "CLAIM_UPDATE", claimId: c.id, status: "REJECTED", resolution: "Not covered" }, "Claim rejected.")}>Reject</Button> : null}
                  <Button type="button" size="sm" onClick={() => run({ action: "CLAIM_UPDATE", claimId: c.id, status: "RESOLVED", resolution: "Resolved" }, "Claim resolved.")}>Mark resolved</Button>
                </div>
              ) : null}
            </div>
          ))}
          {canLog && warranty.state === "ACTIVE" ? (
            <form onSubmit={claimForm.handleSubmit((v) => run({ action: "CLAIM_ADD", description: v.description }, "Claim logged."))} noValidate>
              <FieldGroup>
                <FormField control={claimForm.control} name="description" label="New claim: what is wrong?" multiline idPrefix="claim" />
                <Button type="submit" disabled={claimForm.formState.isSubmitting}>Log claim</Button>
              </FieldGroup>
            </form>
          ) : null}
        </CardContent>
      </Card>
      {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
      {canDecide && warranty.status !== "VOIDED" ? (
        <Card className="max-w-2xl">
          <CardHeader><CardTitle className="font-heading text-lg">Void warranty</CardTitle><CardDescription>For misuse, fraud or a mistake. This cannot be undone.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={voidForm.handleSubmit((v) => run({ action: "VOID", reason: v.reason }, "Warranty voided."))} noValidate>
              <FieldGroup>
                <FormField control={voidForm.control} name="reason" label="Reason" idPrefix="void" />
                <Button type="submit" variant="outline" disabled={voidForm.formState.isSubmitting}>Void warranty</Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
