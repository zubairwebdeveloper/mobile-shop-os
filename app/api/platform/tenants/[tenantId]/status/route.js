import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requirePlatformAdmin } from "@/lib/tenant/context";
import { setTenantStatus } from "@/lib/platform/tenants";
import { tenantStatusSchema } from "@/lib/validations/platform";

/** Suspend (reason required) or reactivate a shop. Platform admin only. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { user } = await requirePlatformAdmin();
  const { tenantId } = await params;
  const { action, reason } = tenantStatusSchema.parse(await readJson(request));
  await setTenantStatus(user.uid, tenantId, action, reason);
  return json({ ok: true });
});
