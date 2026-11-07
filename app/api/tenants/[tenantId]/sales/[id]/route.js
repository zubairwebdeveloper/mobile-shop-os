import { PERMISSIONS } from "@/lib/permissions/matrix";
import { notFound } from "@/lib/security/errors";
import { json, route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";
import { getSale } from "@/lib/sales/sales";

export const GET = route(async (_request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_READ,
  });
  const sale = await getSale(ctx, id);
  if (!sale) throw notFound("Sale not found.");
  return json({ sale });
});
