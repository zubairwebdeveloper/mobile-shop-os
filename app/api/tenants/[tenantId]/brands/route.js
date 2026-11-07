import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { brands, listBrands } from "@/lib/catalog/catalog";
import { brandSchema } from "@/lib/validations/catalog";

export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_READ,
  });
  return json({ brands: await listBrands(ctx) });
});

/** Create a brand (catalog:write: owner or manager). */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_WRITE,
  });
  const input = brandSchema.parse(await readJson(request));
  const { id } = await brands.create(ctx, input);
  return json({ ok: true, id }, 201);
});
