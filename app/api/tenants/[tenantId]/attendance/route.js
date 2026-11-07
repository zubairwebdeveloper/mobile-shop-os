import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";

import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { daySheet, markAttendance } from "@/lib/hr/attendance";
import { attendanceSheetSchema } from "@/lib/validations/hr";
import { z } from "zod";
import { isSafeId } from "@/lib/security/ids";
import { isValidDateStr } from "@/lib/customers/pure";

export const runtime = "nodejs";

const querySchema = z.object({ branchId: z.string().refine(isSafeId), date: z.string().refine(isValidDateStr) });

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_READ });
  const q = new URL(request.url).searchParams;
  return json({ sheet: await daySheet(ctx, querySchema.parse({ branchId: q.get("branchId"), date: q.get("date") })) });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.EMPLOYEES_WRITE });
  return json(await markAttendance(ctx, attendanceSheetSchema.parse(await readJson(request))));
});
