import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createTransfer, listTransfers } from "@/lib/inventory/transfers";
import { transferCreateSchema } from "@/lib/validations/inventory";

export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_READ,
  });
  return json({ transfers: await listTransfers(ctx) });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_ADJUST,
  });
  const { id } = await createTransfer(
    ctx,
    transferCreateSchema.parse(await readJson(request)),
  );
  return json({ ok: true, id }, 201);
});
