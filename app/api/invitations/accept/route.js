import { requireUser } from "@/lib/auth/session";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { acceptInvitation } from "@/lib/tenant/members";
import { acceptInvitationSchema } from "@/lib/validations/team";

/** Accept an invitation addressed to the signed-in, email-verified user. */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { invitationId } = acceptInvitationSchema.parse(
    await readJson(request),
  );
  const { tenantId } = await acceptInvitation(user, invitationId);
  return json({ ok: true, tenantId });
});
