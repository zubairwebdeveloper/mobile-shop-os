import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createReturn, listReturns } from "@/lib/sales/returns";
import { returnCreateSchema } from "@/lib/validations/sales";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_READ,
  });
  return json(
    await listReturns(ctx, {
      cursor: new URL(request.url).searchParams.get("cursor") ?? undefined,
    }),
  );
});

/** Owner/manager only (sales:refund-approve). */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_REFUND_APPROVE,
  });
  const result = await createReturn(
    ctx,
    returnCreateSchema.parse(await readJson(request)),
  );
  return json({ ok: true, ...result }, result.duplicate ? 200 : 201);
});
