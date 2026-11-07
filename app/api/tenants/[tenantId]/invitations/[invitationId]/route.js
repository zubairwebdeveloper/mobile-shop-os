import { PERMISSIONS } from "@/lib/permissions/matrix";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { revokeInvitation } from "@/lib/tenant/members";

export const DELETE = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, invitationId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.MEMBERS_MANAGE,
  });
  await revokeInvitation(ctx, invitationId);
  return json({ ok: true });
});
