import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { lookupCode } from "@/lib/catalog/lookup";
import { lookupSchema } from "@/lib/validations/catalog";

/** Find a product, variant or device by barcode, SKU or IMEI inside this shop. */
export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.CATALOG_READ,
  });
  const { code } = lookupSchema.parse({
    code: new URL(request.url).searchParams.get("code") ?? "",
  });
  const result = await lookupCode(ctx, code);
  return json({ found: result !== null, result });
});
