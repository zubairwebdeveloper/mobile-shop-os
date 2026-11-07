import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { createReconciliation, listReconciliations } from "@/lib/finance/reports";
import { reconcileSchema } from "@/lib/validations/finance";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.FINANCE_READ });
  return json(await listReconciliations(ctx, { cursor: new URL(request.url).searchParams.get("cursor") ?? undefined }));
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.FINANCE_WRITE });
  return json({ ok: true, ...(await createReconciliation(ctx, reconcileSchema.parse(await readJson(request)))) }, 201);
});
