import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { changeRepair, getRepair } from "@/lib/repairs/repairs";
import { notFound } from "@/lib/security/errors";
import { repairActionSchema } from "@/lib/validations/crm";

export const runtime = "nodejs";

export const GET = route(async (_request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.REPAIRS_READ });
  const repair = await getRepair(ctx, id);
  if (!repair) throw notFound("Repair job not found.");
  return json({ repair });
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.REPAIRS_WRITE });
  return json(await changeRepair(ctx, id, repairActionSchema.parse(await readJson(request))));
});
