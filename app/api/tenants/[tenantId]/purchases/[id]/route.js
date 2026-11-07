import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { changePurchaseStatus, getPurchase } from "@/lib/inventory/purchases";
import { notFound } from "@/lib/security/errors";
import { purchaseActionSchema } from "@/lib/validations/inventory";

export const GET = route(async (_request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.PURCHASES_READ,
  });
  const purchase = await getPurchase(ctx, id);
  if (!purchase) throw notFound("Purchase not found.");
  return json({ purchase });
});

/** Body { action: "ORDER" | "CANCEL" }. */
export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.PURCHASES_WRITE,
  });
  const { action } = purchaseActionSchema.parse(await readJson(request));
  await changePurchaseStatus(ctx, id, action);
  return json({ ok: true });
});
