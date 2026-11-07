import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { listImeiRecords, registerImei } from "@/lib/catalog/imei";
import { imeiCreateSchema } from "@/lib/validations/catalog";

/** Records in the caller's branches only. Optional ?q= filters by IMEI, serial or product. */
export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_READ,
  });
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return json({ records: await listImeiRecords(ctx, { q: q.slice(0, 40) }) });
});

/** Register a device (inventory:adjust). Branch access is verified against the caller's scope. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_ADJUST,
  });
  const input = imeiCreateSchema.parse(await readJson(request));
  const { id } = await registerImei(ctx, input);
  return json({ ok: true, id }, 201);
});
