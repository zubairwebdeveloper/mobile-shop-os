import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { getCustomer, updateCustomer } from "@/lib/customers/customers";
import { notFound } from "@/lib/security/errors";
import { customerUpdateSchema } from "@/lib/validations/crm";

export const runtime = "nodejs";

export const GET = route(async (_request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.CUSTOMERS_READ });
  const result = await getCustomer(ctx, id);
  if (!result) throw notFound("Customer not found.");
  return json(result);
});

export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.CUSTOMERS_WRITE });
  return json(await updateCustomer(ctx, id, customerUpdateSchema.parse(await readJson(request))));
});
