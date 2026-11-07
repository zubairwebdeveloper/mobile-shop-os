import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { brands } from "@/lib/catalog/catalog";
import { brandSchema } from "@/lib/validations/catalog";

export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_WRITE,
  });
  const input = brandSchema.parse(await readJson(request));
  await brands.update(ctx, id, input);
  return json({ ok: true });
});
