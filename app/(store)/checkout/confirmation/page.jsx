import { PageHeader } from "@/components/shared/page-header";
import { ConfirmationClient } from "@/components/checkout/confirmation-client";

export const metadata = { title: "Order confirmation" };

export default function ConfirmationPage() {
  return (
    <>
      <PageHeader title="Order confirmation" crumbs={[{ label: "Checkout", href: "/checkout" }, { label: "Confirmation" }]} />
      <div className="container-page py-10">
        <ConfirmationClient />
      </div>
    </>
  );
}
