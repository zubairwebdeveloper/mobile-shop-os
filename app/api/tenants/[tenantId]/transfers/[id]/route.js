import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { changeTransfer } from "@/lib/inventory/transfers";
import { transferActionSchema } from "@/lib/validations/inventory";

/** Body { action: "RECEIVE" | "CANCEL" }. Receive needs the destination branch, cancel the source branch. */
export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.INVENTORY_ADJUST,
  });
  const { action } = transferActionSchema.parse(await readJson(request));
  await changeTransfer(ctx, id, action);
  return json({ ok: true });
});
