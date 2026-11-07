import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { receivePurchase } from "@/lib/inventory/purchases";
import { receiveSchema } from "@/lib/validations/inventory";

/** Receive goods. Idempotent per receiptKey; no over-receipt; IMEI units need one IMEI each. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.PURCHASES_WRITE,
  });
  const result = await receivePurchase(
    ctx,
    id,
    receiveSchema.parse(await readJson(request)),
  );
  return json({ ok: true, ...result });
});
