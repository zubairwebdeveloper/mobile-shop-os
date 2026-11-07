import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { listSupplierPayments, paySupplier } from "@/lib/finance/payables";
import { supplierPaymentSchema } from "@/lib/validations/finance";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.FINANCE_READ });
  return json(await listSupplierPayments(ctx, { cursor: new URL(request.url).searchParams.get("cursor") ?? undefined }));
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.FINANCE_WRITE });
  const result = await paySupplier(ctx, supplierPaymentSchema.parse(await readJson(request)));
  return json({ ok: true, ...result }, result.duplicate ? 200 : 201);
});
