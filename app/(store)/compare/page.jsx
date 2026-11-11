import { PageHeader } from "@/components/shared/page-header";
import { CompareClient } from "@/components/compare/compare-client";

export const metadata = {
  title: "Compare phones",
  description: "Compare specifications, price and ratings of up to three smartphones side by side.",
};

export default function ComparePage() {
  return (
    <>
      <PageHeader
        title="Compare phones"
        description="Pick up to three phones and see how they stack up."
        crumbs={[{ label: "Compare" }]}
      />
      <div className="container-page py-10">
        <CompareClient />
      </div>
    </>
  );
}
