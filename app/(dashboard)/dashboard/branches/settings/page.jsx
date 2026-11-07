import PageHeader from "@/components/shared/PageHeader";
import ShopSettingsForm from "@/features/settings/components/ShopSettingsForm";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getActiveTenantContext();
  const settings = await getShopSettings(ctx);
  const { slug, currency, ...initial } = settings;

  return (
    <>
      <PageHeader title="Settings" description="Your shop's profile and timezone." />
      <ShopSettingsForm
        tenantId={ctx.tenantId}
        initial={initial}
        slug={slug}
        currency={currency}
        canEdit={can(ctx.role, PERMISSIONS.SETTINGS_WRITE)}
      />
    </>
  );
}
