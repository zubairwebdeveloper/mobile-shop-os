import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { notFound } from "@/lib/security/errors";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { employeeMonth } from "@/lib/hr/attendance";
import { employeeActivity } from "@/lib/hr/performance";
import { getEmployee, updateEmployee } from "@/lib/hr/employees";
import { monthSchema, employeeSchema } from "@/lib/validations/hr";

export const runtime = "nodejs";

/** ?month=YYYY-MM adds that month attendance. Recent activity is included only for callers with audit:read. */
export const GET = route(async (request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_READ });
  const employee = await getEmployee(ctx, id);
  if (!employee) throw notFound("Employee not found.");
  const month = new URL(request.url).searchParams.get("month");
  const attendance = month ? await employeeMonth(ctx, employee, monthSchema.parse({ month }).month) : null;
  const activity = can(ctx.role, PERMISSIONS.AUDIT_READ) ? await employeeActivity(ctx, employee) : null;
  return json({ employee, attendance, activity });
});

export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_WRITE });
  return json(await updateEmployee(ctx, id, employeeSchema.parse(await readJson(request))));
});
