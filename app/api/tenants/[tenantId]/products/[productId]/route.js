import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { getProduct, updateProduct } from "@/lib/catalog/catalog";
import { notFound } from "@/lib/security/errors";
import { productSchema } from "@/lib/validations/catalog";

export const GET = route(async (_request, { params }) => {
  const { tenantId, productId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_READ,
  });
  const product = await getProduct(ctx, productId);
  if (!product) throw notFound("Product not found.");
  return json({ product });
});

export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, productId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_WRITE,
  });
  const input = productSchema.parse(await readJson(request));
  await updateProduct(ctx, productId, input);
  return json({ ok: true });
});
