import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requirePlatformAdmin } from "@/lib/tenant/context";
import { approveApplication, rejectApplication } from "@/lib/tenant/onboarding";
import { decisionSchema } from "@/lib/validations/onboarding";


/** Platform admin approves (creates the tenant) or rejects (with a reason) an application. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { user } = await requirePlatformAdmin();
  const { applicationId } = await params;
  const { decision, reason } = decisionSchema.parse(await readJson(request));

  if (decision === "APPROVE") {
    const { tenantId } = await approveApplication(user.uid, applicationId);
    return json({ ok: true, tenantId });
  }

  await rejectApplication(user.uid, applicationId, reason);
  return json({ ok: true });
});
