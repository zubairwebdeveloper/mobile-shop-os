import { PERMISSIONS } from "@/lib/permissions/matrix";

import { json, route } from "@/lib/security/http";

import { requireTenantAccess } from "@/lib/tenant/context";

import { branchAnalytics, employeePerformance } from "@/lib/hr/performance";
import { performanceSchema } from "@/lib/validations/hr";
import { badRequest } from "@/lib/security/errors";

export const runtime = "nodejs";

/** ?view=staff|branch&from=&to=[&branchId=] */
export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_READ });
  const q = new URL(request.url).searchParams;
  const period = performanceSchema.parse({ from: q.get("from"), to: q.get("to"), branchId: q.get("branchId") ?? undefined });
  const view = q.get("view");
  if (view === "staff") return json(await employeePerformance(ctx, period));
  if (view === "branch") return json(await branchAnalytics(ctx, period));
  throw badRequest("view must be staff or branch.");
});
