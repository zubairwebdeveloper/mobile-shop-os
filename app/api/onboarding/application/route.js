import { requireVerifiedUser } from "@/lib/auth/session";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { submitApplication } from "@/lib/tenant/onboarding";
import { applicationSchema } from "@/lib/validations/onboarding";


/**
 * Submit (or resubmit after rejection) the caller's shop application.
 * Requires a signed-in user with a VERIFIED email. The applicant identity comes from the session,
 * never from the body.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const user = await requireVerifiedUser();
  const input = applicationSchema.parse(await readJson(request));
  await submitApplication(user, input);
  return json({ ok: true }, 201);
});
