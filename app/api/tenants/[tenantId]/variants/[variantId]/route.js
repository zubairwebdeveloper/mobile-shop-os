import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { updateVariant } from "@/lib/catalog/catalog";
import { variantSchema } from "@/lib/validations/catalog";

export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, variantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_WRITE,
  });
  const input = variantSchema.parse(await readJson(request));
  await updateVariant(ctx, variantId, input);
  return json({ ok: true });
});
