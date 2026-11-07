import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requirePlatformAdmin } from "@/lib/tenant/context";
import { updateTenantSubscription } from "@/lib/platform/tenants";
import { subscriptionSchema } from "@/lib/validations/platform";

/** Set a shop's plan, subscription status and renewal date (manual billing). Platform admin only. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { user } = await requirePlatformAdmin();
  const { tenantId } = await params;
  const input = subscriptionSchema.parse(await readJson(request));
  await updateTenantSubscription(user.uid, tenantId, input);
  return json({ ok: true });
});
