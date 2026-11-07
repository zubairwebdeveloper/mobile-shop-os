import { PERMISSIONS } from "@/lib/permissions/matrix";
import { json, route } from "@/lib/security/http";
import { requireTenantAccess } from "@/lib/tenant/context";
import { getPosCatalog } from "@/lib/sales/pos";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_CREATE,
  });
  return json(
    await getPosCatalog(ctx, new URL(request.url).searchParams.get("branchId")),
  );
});
