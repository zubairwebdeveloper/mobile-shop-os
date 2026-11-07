import { PERMISSIONS } from "@/lib/permissions/matrix";
import { json, route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";

import { financeReport } from "@/lib/finance/reports";
import { periodSchema } from "@/lib/validations/finance";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.FINANCE_READ });
  const q = new URL(request.url).searchParams;
  const period = periodSchema.parse({ from: q.get("from"), to: q.get("to"), branchId: q.get("branchId") ?? undefined });
  return json({ report: await financeReport(ctx, period) });
});
