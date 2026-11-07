import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { createPlan, listActivePlans } from "@/lib/finance/installments";
import { installmentPlanSchema } from "@/lib/validations/finance";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SALES_READ });
  const branchId = new URL(request.url).searchParams.get("branchId") ?? undefined;
  return json(await listActivePlans(ctx, { branchId }));
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SALES_CREATE });
  return json({ ok: true, ...(await createPlan(ctx, installmentPlanSchema.parse(await readJson(request)))) }, 201);
});
