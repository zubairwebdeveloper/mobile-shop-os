import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { collectPayment, listPayments } from "@/lib/finance/collections";
import { collectSchema } from "@/lib/validations/finance";

export const runtime = "nodejs";

export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SALES_READ });
  return json(await listPayments(ctx, { cursor: new URL(request.url).searchParams.get("cursor") ?? undefined }));
});

/** Records money received against a credit sale or delivered repair. The same paymentKey never records twice. */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SALES_CREATE });
  const result = await collectPayment(ctx, collectSchema.parse(await readJson(request)));
  return json({ ok: true, ...result }, result.duplicate ? 200 : 201);
});
