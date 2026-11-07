import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";

import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { commissionMonth, finalizeCommission, markCommissionPaid } from "@/lib/hr/commissions";
import { commissionActionSchema, monthSchema } from "@/lib/validations/hr";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_READ });
  const q = new URL(request.url).searchParams;
  return json(await commissionMonth(ctx, monthSchema.parse({ month: q.get("month"), branchId: q.get("branchId") ?? undefined })));
});

/** FINALIZE a ended month for one employee (the server recomputes sales) or MARK_PAID. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_WRITE });
  const input = commissionActionSchema.parse(await readJson(request));
  return json(input.action === "FINALIZE" ? await finalizeCommission(ctx, input) : await markCommissionPaid(ctx, input), input.action === "FINALIZE" ? 201 : 200);
});
