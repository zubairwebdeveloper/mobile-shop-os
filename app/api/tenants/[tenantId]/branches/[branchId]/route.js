import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { updateBranch } from "@/lib/tenant/branches";
import { requireTenantAccess } from "@/lib/tenant/context";
import { branchSchema } from "@/lib/validations/onboarding";


/** Update a branch's name, address and phone (OWNER only). */
export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, branchId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SETTINGS_WRITE });
  const input = branchSchema.parse(await readJson(request));
  await updateBranch(ctx, branchId, input);
  return json({ ok: true });
});
