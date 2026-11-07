import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { recountImeiInventory } from "@/lib/inventory/recount";

/** Rebuild IMEI stock counters from the devices. All-branches members only. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_ADJUST,
  });
  return json({ ok: true, ...(await recountImeiInventory(ctx)) });
});
