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
import { ASSIGNABLE_ROLES, invitationSchema, memberUpdateSchema } from "@/lib/validations/team";
import BranchScopeFields from "./BranchScopeFields";

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role, label: role.charAt(0) + role.slice(1).toLowerCase() }));
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled (cannot sign in to this shop)" },
];

async function callApi(url, method, payload) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "The request failed. Please try again.");
  return body;
}

function MemberForm({ member, branches, onSubmit, onCancel }) {
  const form = useForm({
    resolver: zodResolver(memberUpdateSchema),
    defaultValues: { role: member.role, status: member.status, allBranches: member.allBranches, branchIds: member.branchIds },
  });
  const prefix = `member-${member.uid}`;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="role" label="Role" options={ROLE_OPTIONS} idPrefix={prefix} />
        <FormField control={form.control} name="status" label="Status" options={STATUS_OPTIONS} idPrefix={prefix} />
        <BranchScopeFields control={form.control} branches={branches} idPrefix={prefix} />
        <div className="flex gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function InviteForm({ branches, onSubmit }) {
  const form = useForm({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: "", role: "CASHIER", allBranches: false, branchIds: [] },
  });

  async function submit(values) {
    const ok = await onSubmit(values);
    if (ok) form.reset();
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="email" label="Email" type="email" autoComplete="off" idPrefix="invite" />
        <FormField control={form.control} name="role" label="Role" options={ROLE_OPTIONS} idPrefix="invite" />
        <BranchScopeFields control={form.control} branches={branches} idPrefix="invite" />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Inviting..." : "Send invitation"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export default function TeamManager({ tenantId, currentUid, members, invitations, branches, seatsUsed, seatsMax }) {
  const router = useRouter();
  const [editingUid, setEditingUid] = useState(null);
  const branchName = (id) => branches.find((b) => b.id === id)?.name ?? "Removed branch";

  async function saveMember(uid, values) {
    try {
      await callApi(`/api/tenants/${tenantId}/members/${uid}`, "PATCH", values);
      toast.success("Member updated.");
      setEditingUid(null);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function invite(values) {
    try {
      await callApi(`/api/tenants/${tenantId}/invitations`, "POST", values);
      toast.success("Invitation created. Ask them to sign up with this email.");
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  }

  async function revoke(id) {
    try {
      await callApi(`/api/tenants/${tenantId}/invitations/${id}`, "DELETE");
      toast.success("Invitation revoked.");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section aria-label="Team members" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {seatsUsed} of {seatsMax ?? "—"} team seats used.
          </p>
          {members.map((member) => (
            <Card key={member.uid}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="font-heading text-lg">{member.displayName || member.email}</CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={member.role} tone="neutral" />
                    <StatusBadge status={member.status} tone={member.status === "ACTIVE" ? "success" : "neutral"} />
                  </div>
                </div>
                <CardDescription>
                  {member.email} · {member.allBranches ? "All branches" : member.branchIds.map(branchName).join(", ") || "No branches"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {member.role === "OWNER" || member.uid === currentUid ? (
                  <p className="text-sm text-muted-foreground">
                    {member.role === "OWNER" ? "The owner's access cannot be changed." : "You cannot change your own access."}
                  </p>
                ) : editingUid === member.uid ? (
                  <MemberForm
                    member={member}
                    branches={branches}
                    onSubmit={(values) => saveMember(member.uid, values)}
                    onCancel={() => setEditingUid(null)}
                  />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditingUid(member.uid)}>
                    Edit access
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>

        <section aria-label="Pending invitations">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Pending invitations</CardTitle>
              <CardDescription>No email is sent yet. The person signs up (or signs in) with the invited address and accepts.</CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending invitations.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {invitations.map((invitation) => (
                    <li key={invitation.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{invitation.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {invitation.role.toLowerCase()} ·{" "}
                          {invitation.allBranches ? "all branches" : invitation.branchIds.map(branchName).join(", ")}
                        </span>
                      </span>
                      <Button size="sm" variant="outline" onClick={() => revoke(invitation.id)}>
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Invite someone</CardTitle>
          <CardDescription>Choose their role and branches. Only the owner can do this.</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm branches={branches} onSubmit={invite} />
        </CardContent>
      </Card>
    </div>
  );
}
