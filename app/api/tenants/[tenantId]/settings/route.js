import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { updateShopSettings } from "@/lib/tenant/settings";
import { shopSettingsSchema } from "@/lib/validations/team";

/** Update shop profile and timezone (OWNER only: settings:write). */
export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SETTINGS_WRITE,
  });
  const input = shopSettingsSchema.parse(await readJson(request));
  await updateShopSettings(ctx, input);
  return json({ ok: true });
});
