"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { formatUtc } from "@/lib/formatters/date";
import { rejectionFormSchema } from "@/lib/validations/onboarding";
import { Inbox } from "lucide-react";

async function sendDecision(applicationId, payload) {
  const response = await fetch(`/api/platform/applications/${applicationId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request failed. Please try again.");
  return body;
}

function RejectForm({ applicationId, onDone, onCancel }) {
  const form = useForm({
    resolver: zodResolver(rejectionFormSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values) {
    try {
      await sendDecision(applicationId, { decision: "REJECT", reason: values.reason });
      toast.success("Application rejected.");
      onDone();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="w-full">
      <FieldGroup>
        <FormField
          control={form.control}
          name="reason"
          label="Reason shown to the applicant"
          multiline
          idPrefix={`reject-${applicationId}`}
        />
        <div className="flex gap-2">
          <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Rejecting..." : "Confirm rejection"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function ApplicationCard({ application, onDecided }) {
  const [mode, setMode] = useState("idle"); // idle | confirmApprove | reject
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      await sendDecision(application.id, { decision: "APPROVE" });
      toast.success(`"${application.shopName}" was created.`);
      onDecided(application.id);
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  }

  const details = [
    ["Owner", application.ownerName],
    ["Email", application.applicantEmail],
    ["Phone", application.phone],
    ["City", application.city],
    ["Street address", application.address],
    ["Expected branches", application.expectedBranches],
    ["Requested address", application.slug],
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-xl">{application.shopName}</CardTitle>
          <StatusBadge status="PENDING" />
        </div>
        <CardDescription>
          Submitted {application.createdAt ? formatUtc(application.createdAt) : "recently"}
          {application.submissionCount > 1 ? ` (attempt ${application.submissionCount})` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        {mode === "idle" ? (
          <>
            <Button onClick={() => setMode("confirmApprove")}>Approve</Button>
            <Button variant="outline" onClick={() => setMode("reject")}>
              Reject
            </Button>
          </>
        ) : null}
        {mode === "confirmApprove" ? (
          <>
            <p className="w-full text-sm text-muted-foreground">
              This creates the shop for {application.applicantEmail}. Continue?
            </p>
            <Button onClick={approve} disabled={busy}>
              {busy ? "Creating shop..." : "Yes, create shop"}
            </Button>
            <Button variant="outline" onClick={() => setMode("idle")} disabled={busy}>
              Cancel
            </Button>
          </>
        ) : null}
        {mode === "reject" ? (
          <RejectForm
            applicationId={application.id}
            onDone={() => onDecided(application.id)}
            onCancel={() => setMode("idle")}
          />
        ) : null}
      </CardFooter>
    </Card>
  );
}

export default function ApplicationReviewList({ initialApplications }) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);

  function handleDecided(id) {
    setApplications((current) => current.filter((item) => item.id !== id));
    router.refresh();
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No pending applications"
        description="New shop applications will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} onDecided={handleDecided} />
      ))}
    </div>
  );
}
