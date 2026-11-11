import { PageHeader } from "@/components/shared/page-header";
import { FinderClient } from "@/components/finder/finder-client";

export const metadata = {
  title: "Smart Phone Finder",
  description: "Tell us your budget and priorities, and we rank the best phones for you.",
};

export default function FinderPage() {
  return (
    <>
      <PageHeader
        title="Smart Phone Finder"
        description="Set your budget, choose what matters most and get instant recommendations."
        crumbs={[{ label: "Phone Finder" }]}
      />
      <div className="container-page py-10">
        <FinderClient />
      </div>
    </>
  );
}
