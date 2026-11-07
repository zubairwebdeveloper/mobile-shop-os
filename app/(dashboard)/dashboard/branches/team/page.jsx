import { UsersRound } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import TeamManager from "@/features/team/components/TeamManager";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { listMembers, listPendingInvitations } from "@/lib/tenant/members";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.MEMBERS_MANAGE)) {
    return (
      <>
        <PageHeader title="Team" />
        <EmptyState icon={UsersRound} title="Owner only" description="Only the shop owner can manage the team." />
      </>
    );
  }

  const [members, invitations, branches] = await Promise.all([listMembers(ctx), listPendingInvitations(ctx), listBranches(ctx)]);

  return (
    <>
      <PageHeader title="Team" description="Who can use this shop, their role and which branches they can see." />
      <TeamManager
        tenantId={ctx.tenantId}
        currentUid={ctx.user.uid}
        members={members}
        invitations={invitations}
        branches={branches.filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }))}
        seatsUsed={members.filter((m) => m.status === "ACTIVE").length}
        seatsMax={ctx.tenant.limits.maxEmployees}
      />
    </>
  );
}
