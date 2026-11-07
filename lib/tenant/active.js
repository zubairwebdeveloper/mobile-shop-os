import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { requireTenantAccess, resolveActiveTenant } from "./context";

const DEV_MODE =
  process.env.NODE_ENV === "development" &&
  process.env.ALLOW_DEV_PLATFORM_ADMIN === "true";

export async function getActiveTenantContext() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // Temporary development tenant
  if (DEV_MODE && user.uid === "dev-user") {
    return {
      user,
      tenantId: "dev-tenant",
      role: "OWNER",
      allBranches: true,
      branchIds: [],
      tenant: {
        name: "Development Restaurant",
        planId: "development",
        limits: {},
        counters: {},
      },
      tenants: [
        {
          id: "dev-tenant",
          name: "Development Restaurant",
          role: "OWNER",
        },
      ],
    };
  }

  const cookieStore = await cookies();
  const hint = cookieStore.get("msos_tenant")?.value;

  const { activeTenantId, tenants } = await resolveActiveTenant(user.uid, hint);

  if (!activeTenantId) {
    redirect("/onboarding");
  }

  const ctx = await requireTenantAccess(activeTenantId);

  return { ...ctx, tenants };
}
