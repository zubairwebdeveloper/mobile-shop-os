import { PERMISSIONS } from "@/lib/permissions/matrix";
import { json, route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";
import { listExchangeCredits } from "@/lib/sales/returns";

export const GET = route(async (_request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SALES_CREATE });
  return json({ credits: await listExchangeCredits(ctx) });
});
