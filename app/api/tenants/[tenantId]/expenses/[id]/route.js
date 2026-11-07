import { PERMISSIONS } from "@/lib/permissions/matrix";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireTenantAccess } from "@/lib/tenant/context";

import { voidExpense } from "@/lib/finance/expenses";
import { expenseVoidSchema } from "@/lib/validations/finance";

export const runtime = "nodejs";

/** Expenses are never deleted. PATCH voids one, with a reason. */
export const PATCH = route(async (request, { params }) => {
  assertSameOrigin(request);
  const { tenantId, id } = await params;
  const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.FINANCE_WRITE });
  return json(await voidExpense(ctx, id, expenseVoidSchema.parse(await readJson(request))));
});
