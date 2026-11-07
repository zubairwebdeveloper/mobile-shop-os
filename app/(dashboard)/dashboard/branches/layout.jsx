import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import BranchHydrator from "@/components/dashboard/BranchHydrator";
import TenantHydrator from "@/components/dashboard/TenantHydrator";
import { getSessionUser } from "@/lib/auth/session";
import { getTenantStatus, isPlatformAdmin } from "@/lib/platform/admin";
import { listBranches } from "@/lib/tenant/branches";
import { requireTenantAccess, resolveActiveTenant } from "@/lib/tenant/context";
import { listMyInvitations } from "@/lib/tenant/members";

export const metadata = {
  title: "Dashboard",
};

// Per-request: depends on cookies, must never be statically cached.

/**
 * Server-side gate for the whole dashboard.
 * NOTE: layouts are not re-run on client-side navigation between child pages, so this is a
 * convenience/redirect gate only. Every data route/Server Action MUST call requireTenantAccess().
 */
export default async function DashboardLayout({ children }) {
  // Local UI preview only. Ignored in production builds.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_UNAUTHENTICATED_DASHBOARD_DEV === "true"
  ) {
    return <DashboardShell>{children}</DashboardShell>;
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");

  const cookieStore = await cookies();
  const hintedTenantId = cookieStore.get("msos_tenant")?.value;
  const { activeTenantId, tenants } = await resolveActiveTenant(user.uid, hintedTenantId);

  if (!activeTenantId) {
    // Someone with a pending invitation joins that shop; platform admins belong in the platform area.
    if ((await listMyInvitations(user)).length > 0) redirect("/invitations");
    redirect((await isPlatformAdmin(user.uid)) ? "/platform/dashboard" : "/onboarding");
  }

  // Suspended (or missing) shop: show an explanation instead of a generic error.
  if ((await getTenantStatus(activeTenantId)) !== "ACTIVE") redirect("/suspended");

  const ctx = await requireTenantAccess(activeTenantId);
  const branches = (await listBranches(ctx)).filter((b) => b.active).map((b) => ({ id: b.id, name: b.name }));

  return (
    <DashboardShell>
      <TenantHydrator activeTenantId={activeTenantId} tenants={tenants} />
      <BranchHydrator branches={branches} canSeeAll={ctx.allBranches} />
      {children}
    </DashboardShell>
  );
}
