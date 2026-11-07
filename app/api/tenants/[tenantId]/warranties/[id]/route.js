import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { changeWarranty, getWarranty } from "@/lib/warranty/warranty";
import { notFound } from "@/lib/security/errors";
import { warrantyActionSchema } from "@/lib/validations/crm";

export const runtime = "nodejs";

export const GET = route(async (_request, { params }) => {
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.CUSTOMERS_READ });
  const warranty = await getWarranty(ctx, id);
  if (!warranty) throw notFound("Warranty not found.");
  return json({ warranty });
});

/** Logging a claim needs customers:write; voiding a warranty or deciding a claim needs sales:refund-approve (owner, manager). */
export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const input = warrantyActionSchema.parse(await readJson(request));
  const permission = input.action === "CLAIM_ADD" ? PERMISSIONS.CUSTOMERS_WRITE : PERMISSIONS.SALES_REFUND_APPROVE;
  const ctx = await requireTenantAccess(tenantId, { permission });
  return json(await changeWarranty(ctx, id, input));
});
