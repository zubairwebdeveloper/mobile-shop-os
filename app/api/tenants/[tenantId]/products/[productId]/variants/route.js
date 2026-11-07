import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createVariant } from "@/lib/catalog/catalog";
import { variantSchema } from "@/lib/validations/catalog";

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, productId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_WRITE,
  });
  const input = variantSchema.parse(await readJson(request));
  const { id } = await createVariant(ctx, productId, input);
  return json({ ok: true, id }, 201);
});
