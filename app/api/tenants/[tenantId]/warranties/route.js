import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";
import { expiringWarranties, listWarranties, lookupWarranties, registerWarranties } from "@/lib/warranty/warranty";
import { warrantyRegisterSchema } from "@/lib/validations/crm";

export const runtime = "nodejs";

/** ?lookup=<IMEI or phone>, ?expiring=<days, max 90>, or the newest-first list (?cursor=). */
export const GET = route(async (request, { params }) => {
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.CUSTOMERS_READ });
  const sp = new URL(request.url).searchParams;
  if (sp.get("lookup")) return json({ warranties: await lookupWarranties(ctx, sp.get("lookup")) });
  if (sp.get("expiring")) return json({ warranties: await expiringWarranties(ctx, Math.min(Math.max(Number(sp.get("expiring")) || 30, 1), 90)) });
  return json(await listWarranties(ctx, { cursor: sp.get("cursor") ?? undefined }));
});

export const POST = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.CUSTOMERS_WRITE });
  return json({ ok: true, ...(await registerWarranties(ctx, warrantyRegisterSchema.parse(await readJson(request)))) }, 201);
});
