import { PERMISSIONS } from "@/lib/permissions/matrix";
import { notFound } from "@/lib/security/errors";
import { json, route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";

import { getPayment } from "@/lib/finance/collections";

export const runtime = "nodejs";

export const GET = route(async (_request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SALES_READ });
  const payment = await getPayment(ctx, id);
  if (!payment) throw notFound("Receipt not found.");
  return json({ payment });
});
