import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createSupplier, listSuppliers } from "@/lib/inventory/suppliers";
import { supplierSchema } from "@/lib/validations/inventory";

export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.PURCHASES_READ,
  });
  return json({ suppliers: await listSuppliers(ctx) });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.PURCHASES_WRITE,
  });
  const { id } = await createSupplier(
    ctx,
    supplierSchema.parse(await readJson(request)),
  );
  return json({ ok: true, id }, 201);
});
