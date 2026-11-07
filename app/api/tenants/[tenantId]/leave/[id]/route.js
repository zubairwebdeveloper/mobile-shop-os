import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";

import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { decideLeave } from "@/lib/hr/leave";
import { leaveDecisionSchema } from "@/lib/validations/hr";

export const runtime = "nodejs";

export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_WRITE });
  return json(await decideLeave(ctx, id, leaveDecisionSchema.parse(await readJson(request))));
});
