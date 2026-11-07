"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function AcceptInvitationList({ invitations }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function accept(id) {
    setBusyId(id);
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: id }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "The request failed. Please try again.");
      toast.success("You joined the shop.");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
      setBusyId(null);
    }
  }

  return (
    <ul className="divide-y">
      {invitations.map((invitation) => (
        <li key={invitation.id} className="flex items-center justify-between gap-3 py-3 text-sm">
          <span>
            <span className="block font-medium">{invitation.tenantName || "A shop"}</span>
            <span className="text-muted-foreground">Role: {invitation.role.toLowerCase()}</span>
          </span>
          <Button onClick={() => accept(invitation.id)} disabled={busyId !== null}>
            {busyId === invitation.id ? "Joining..." : "Accept"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
