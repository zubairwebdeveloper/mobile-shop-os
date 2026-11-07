import { PERMISSIONS } from "@/lib/permissions/matrix";
import { notFound } from "@/lib/security/errors";
import { json, route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";

import { getPlan } from "@/lib/finance/installments";

export const runtime = "nodejs";

export const GET = route(async (_request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SALES_READ });
  const plan = await getPlan(ctx, id);
  if (!plan) throw notFound("Installment plan not found.");
  return json({ plan });
});
