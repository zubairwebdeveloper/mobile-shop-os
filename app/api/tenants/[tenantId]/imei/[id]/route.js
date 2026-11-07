import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { getImeiRecord, updateImei } from "@/lib/catalog/imei";
import { notFound } from "@/lib/security/errors";
import { imeiUpdateSchema } from "@/lib/validations/catalog";

export const GET = route(async (_request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_READ,
  });
  const record = await getImeiRecord(ctx, id);
  if (!record) throw notFound("Device not found.");
  return json({ record });
});

export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_ADJUST,
  });
  const input = imeiUpdateSchema.parse(await readJson(request));
  await updateImei(ctx, id, input);
  return json({ ok: true });
});
