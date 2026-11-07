import { PERMISSIONS } from "@/lib/permissions/matrix";
import { json, route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";
import { listAvailableImeis } from "@/lib/sales/pos";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_CREATE,
  });
  const sp = new URL(request.url).searchParams;
  return json({
    devices: await listAvailableImeis(
      ctx,
      sp.get("branchId"),
      sp.get("variantId"),
    ),
  });
});
