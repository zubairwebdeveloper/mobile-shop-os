import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { updateMember } from "@/lib/tenant/members";
import { memberUpdateSchema } from "@/lib/validations/team";

/** Change a member's role, status or branch access (OWNER only). Owner row and own row are locked. */
export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, uid } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.MEMBERS_MANAGE,
  });
  const input = memberUpdateSchema.parse(await readJson(request));
  await updateMember(ctx, uid, input);
  return json({ ok: true });
});
