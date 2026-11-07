import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { closeDay, listClosings } from "@/lib/sales/closing";
import { closingSchema } from "@/lib/validations/sales";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_READ,
  });
  return json(
    await listClosings(ctx, {
      cursor: new URL(request.url).searchParams.get("cursor") ?? undefined,
    }),
  );
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, {
    permission: PERMISSIONS.SALES_CREATE,
  });
  const result = await closeDay(
    ctx,
    closingSchema.parse(await readJson(request)),
  );
  return json({ ok: true, ...result }, 201);
});
