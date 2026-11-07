import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";

import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { listLeaves, requestLeave } from "@/lib/hr/leave";
import { leaveRequestSchema } from "@/lib/validations/hr";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_READ });
  const q = new URL(request.url).searchParams;
  return json({ leaves: await listLeaves(ctx, { branchId: q.get("branchId") ?? undefined, status: q.get("status") ?? undefined }) });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_WRITE });
  return json({ ok: true, ...(await requestLeave(ctx, leaveRequestSchema.parse(await readJson(request)))) }, 201);
});
