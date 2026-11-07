import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createSale, listSales } from "@/lib/sales/sales";
import { saleCreateSchema } from "@/lib/validations/sales";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_READ,
  });
  return json(
    await listSales(ctx, {
      cursor: new URL(request.url).searchParams.get("cursor") ?? undefined,
    }),
  );
});

/** Checkout. Prices come from the catalogue on the server. The same saleKey never creates two sales. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_CREATE,
  });
  const result = await createSale(
    ctx,
    saleCreateSchema.parse(await readJson(request)),
  );
  return json({ ok: true, ...result }, result.duplicate ? 200 : 201);
});
