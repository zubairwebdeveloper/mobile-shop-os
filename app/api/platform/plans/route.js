import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requirePlatformAdmin } from "@/lib/tenant/context";
import { createPlan } from "@/lib/platform/plans";
import { planCreateSchema } from "@/lib/validations/platform";

/** Create a plan. The ID becomes the document ID and cannot be changed later. Platform admin only. */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { user } = await requirePlatformAdmin();
  const input = planCreateSchema.parse(await readJson(request));
  await createPlan(user.uid, input);
  return json({ ok: true, id: input.id }, 201);
});
