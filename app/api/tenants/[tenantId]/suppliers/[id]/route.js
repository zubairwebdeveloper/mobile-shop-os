import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { updateSupplier } from "@/lib/inventory/suppliers";
import { supplierSchema } from "@/lib/validations/inventory";

export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.PURCHASES_WRITE,
  });
  await updateSupplier(ctx, id, supplierSchema.parse(await readJson(request)));
  return json({ ok: true });
});
