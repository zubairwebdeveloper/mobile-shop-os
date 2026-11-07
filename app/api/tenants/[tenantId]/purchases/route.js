import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createPurchase, listPurchases } from "@/lib/inventory/purchases";
import { purchaseCreateSchema } from "@/lib/validations/inventory";

export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.PURCHASES_READ,
  });
  return json({ purchases: await listPurchases(ctx) });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.PURCHASES_WRITE,
  });
  const { id } = await createPurchase(
    ctx,
    purchaseCreateSchema.parse(await readJson(request)),
  );
  return json({ ok: true, id }, 201);
});
