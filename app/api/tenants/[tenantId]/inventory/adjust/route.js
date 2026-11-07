import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { adjustStock } from "@/lib/inventory/adjust";
import { adjustSchema } from "@/lib/validations/inventory";

/** Manual adjustment of non-IMEI stock (inventory:adjust + branch access). */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_ADJUST,
  });
  await adjustStock(ctx, adjustSchema.parse(await readJson(request)));
  return json({ ok: true });
});
