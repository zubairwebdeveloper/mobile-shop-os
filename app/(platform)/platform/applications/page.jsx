import PageHeader from "@/components/shared/PageHeader";
import ApplicationReviewList from "@/features/platform/components/ApplicationReviewList";
import { requirePlatformAdmin } from "@/lib/tenant/context";
import { listPendingApplications } from "@/lib/tenant/onboarding";

export const metadata = { title: "Applications" };

export default async function PlatformApplicationsPage() {
  await requirePlatformAdmin(); // re-check: layouts do not re-run on client navigation
  const applications = await listPendingApplications();

  return (
    <>
      <PageHeader
        title="Shop applications"
        description="Approving creates the shop, its owner membership and its main branch in one step."
      />
      <ApplicationReviewList initialApplications={applications} />
    </>
  );
}
