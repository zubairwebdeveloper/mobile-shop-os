import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requirePlatformAdmin } from "@/lib/tenant/context";
import { updatePlan } from "@/lib/platform/plans";
import { planUpdateSchema } from "@/lib/validations/platform";

/** Update a plan definition (existing shops keep their limits snapshot). Platform admin only. */
export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { user } = await requirePlatformAdmin();
  const { planId } = await params;
  const input = planUpdateSchema.parse(await readJson(request));
  await updatePlan(user.uid, planId, input);
  return json({ ok: true });
});
