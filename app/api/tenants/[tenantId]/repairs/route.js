import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { createRepair, listRepairs } from "@/lib/repairs/repairs";
import { repairCreateSchema } from "@/lib/validations/crm";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.REPAIRS_READ });
  return json(await listRepairs(ctx, { cursor: new URL(request.url).searchParams.get("cursor") ?? undefined }));
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.REPAIRS_WRITE });
  return json({ ok: true, ...(await createRepair(ctx, repairCreateSchema.parse(await readJson(request)))) }, 201);
});
