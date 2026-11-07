import { PERMISSIONS } from "@/lib/permissions/matrix";
import { json, route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";
import { listMembers } from "@/lib/tenant/members";

/** Team list (OWNER only: members:manage). */
export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.MEMBERS_MANAGE,
  });
  return json({ members: await listMembers(ctx) });
});
