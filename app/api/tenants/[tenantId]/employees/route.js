import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";

import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { createEmployee, listEmployees } from "@/lib/hr/employees";
import { employeeSchema } from "@/lib/validations/hr";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_READ });
  return json({ employees: await listEmployees(ctx, { branchId: new URL(request.url).searchParams.get("branchId") ?? undefined }) });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_WRITE });
  return json({ ok: true, ...(await createEmployee(ctx, employeeSchema.parse(await readJson(request)))) }, 201);
});
