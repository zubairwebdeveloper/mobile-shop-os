import PageHeader from "@/components/shared/PageHeader";
import TenantTable from "@/features/platform/components/TenantTable";
import { listTenants } from "@/lib/platform/tenants";
import { requirePlatformAdmin } from "@/lib/tenant/context";

export const metadata = { title: "Shops" };

export default async function PlatformTenantsPage() {
  await requirePlatformAdmin();
  const tenants = await listTenants(200);

  return (
    <>
      <PageHeader title="Shops" description="Every shop on the platform. Open one to manage its subscription or suspend it." />
      <TenantTable tenants={tenants} />
    </>
  );
}
