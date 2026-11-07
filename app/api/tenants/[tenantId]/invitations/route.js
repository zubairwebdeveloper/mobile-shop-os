import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createInvitation, listPendingInvitations } from "@/lib/tenant/members";
import { invitationSchema } from "@/lib/validations/team";

export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.MEMBERS_MANAGE,
  });
  return json({ invitations: await listPendingInvitations(ctx) });
});

/** Invite someone by email (OWNER only). No email is sent yet: the person signs up with this address and accepts. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.MEMBERS_MANAGE,
  });
  const input = invitationSchema.parse(await readJson(request));
  const { id } = await createInvitation(ctx, input);
  return json({ ok: true, id }, 201);
});
