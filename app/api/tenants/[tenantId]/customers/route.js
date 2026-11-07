import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createCustomer, searchCustomers } from "@/lib/customers/customers";
import { customerSchema } from "@/lib/validations/crm";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.CUSTOMERS_READ });
  const sp = new URL(request.url).searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 200, 1), 200);
  return json({ customers: await searchCustomers(ctx, { q: sp.get("q") ?? "", limit }) });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.CUSTOMERS_WRITE });
  return json({ ok: true, ...(await createCustomer(ctx, customerSchema.parse(await readJson(request)))) }, 201);
});
