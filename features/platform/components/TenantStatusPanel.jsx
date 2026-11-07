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
import { suspendFormSchema } from "@/lib/validations/platform";

async function changeStatus(tenantId, payload) {
  const response = await fetch(`/api/platform/tenants/${tenantId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request failed. Please try again.");
}

function SuspendForm({ tenantId, onDone, onCancel }) {
  const form = useForm({ resolver: zodResolver(suspendFormSchema), defaultValues: { reason: "" } });

  async function onSubmit(values) {
    try {
      await changeStatus(tenantId, { action: "SUSPEND", reason: values.reason });
      toast.success("Shop suspended.");
      onDone();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormField
          control={form.control}
          name="reason"
          label="Reason (recorded in the audit log)"
          description="Users of this shop lose access immediately. No data is deleted."
          multiline
          idPrefix="suspend"
        />
        <div className="flex gap-2">
          <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Suspending..." : "Confirm suspension"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export default function TenantStatusPanel({ tenantId, status, suspension }) {
  const router = useRouter();
  const [mode, setMode] = useState("idle"); // idle | suspend | confirmReactivate
  const [busy, setBusy] = useState(false);

  const done = () => {
    setMode("idle");
    router.refresh();
  };

  async function reactivate() {
    setBusy(true);
    try {
      await changeStatus(tenantId, { action: "REACTIVATE" });
      toast.success("Shop reactivated.");
      done();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Access</CardTitle>
        <CardDescription>
          {status === "ACTIVE" ? "The shop is active." : "The shop is suspended and its users are locked out."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "SUSPENDED" && suspension?.reason ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            Suspension reason: {suspension.reason}
          </p>
        ) : null}

        {status === "ACTIVE" && mode === "idle" ? (
          <Button variant="outline" onClick={() => setMode("suspend")}>
            Suspend shop
          </Button>
        ) : null}
        {status === "ACTIVE" && mode === "suspend" ? (
          <SuspendForm tenantId={tenantId} onDone={done} onCancel={() => setMode("idle")} />
        ) : null}

        {status === "SUSPENDED" && mode === "idle" ? (
          <Button onClick={() => setMode("confirmReactivate")}>Reactivate shop</Button>
        ) : null}
        {status === "SUSPENDED" && mode === "confirmReactivate" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Users regain access immediately. Continue?</p>
            <div className="flex gap-2">
              <Button onClick={reactivate} disabled={busy}>
                {busy ? "Reactivating..." : "Yes, reactivate"}
              </Button>
              <Button variant="outline" onClick={() => setMode("idle")} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
