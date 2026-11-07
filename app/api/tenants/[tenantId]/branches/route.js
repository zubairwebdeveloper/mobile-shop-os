import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { createBranch, listBranches } from "@/lib/tenant/branches";
import { requireTenantAccess } from "@/lib/tenant/context";
import { branchSchema } from "@/lib/validations/onboarding";


/** Branches the caller may see in this tenant. */
export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId);
  return json({ branches: await listBranches(ctx) });
});

/** Create a branch (OWNER only: settings:write). The plan's branch limit is enforced server-side. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SETTINGS_WRITE });
  const input = branchSchema.parse(await readJson(request));
  const { id } = await createBranch(ctx, input);
  return json({ ok: true, id }, 201);
});
