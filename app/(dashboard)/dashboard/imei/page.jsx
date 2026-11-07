import PageHeader from "@/components/shared/PageHeader";
import ImeiManager from "@/features/catalog/components/ImeiManager";
import LookupBox from "@/features/catalog/components/LookupBox";
import { listProducts } from "@/lib/catalog/catalog";
import { variantLabel } from "@/lib/catalog/pure";
import { getProduct } from "@/lib/catalog/catalog";
import { listImeiRecords } from "@/lib/catalog/imei";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";

export const metadata = { title: "IMEI" };

export default async function ImeiPage() {
  const ctx = await getActiveTenantContext();
  const canRegister = can(ctx.role, PERMISSIONS.INVENTORY_ADJUST);

  const [records, branches] = await Promise.all([listImeiRecords(ctx), listBranches(ctx)]);

  // Only active, IMEI-tracked variants can receive devices.
  let variantOptions = [];
  if (canRegister) {
    const tracked = (await listProducts(ctx)).filter((p) => p.tracksImei && p.status === "ACTIVE");
    const full = await Promise.all(tracked.map((p) => getProduct(ctx, p.id)));
    variantOptions = full
      .filter(Boolean)
      .flatMap((p) => p.variants.filter((v) => v.status === "ACTIVE").map((v) => ({ value: v.id, label: `${p.name} (${variantLabel(v)})` })));
  }

  return (
    <>
      <PageHeader title="IMEI" description="Track each device by IMEI. Lookups cover only your shop and the branches you can access." />
      <div className="mb-8">
        <LookupBox tenantId={ctx.tenantId} />
      </div>
      <ImeiManager
        tenantId={ctx.tenantId}
        records={records}
        variantOptions={variantOptions}
        branches={branches.filter((b) => b.active)}
        canRegister={canRegister}
      />
    </>
  );
}
