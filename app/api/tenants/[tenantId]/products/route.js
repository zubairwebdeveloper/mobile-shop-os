import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createProduct, listProducts } from "@/lib/catalog/catalog";
import { productSchema } from "@/lib/validations/catalog";

export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_READ,
  });
  return json({ products: await listProducts(ctx) });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_WRITE,
  });
  const input = productSchema.parse(await readJson(request));
  const { id } = await createProduct(ctx, input);
  return json({ ok: true, id }, 201);
});
