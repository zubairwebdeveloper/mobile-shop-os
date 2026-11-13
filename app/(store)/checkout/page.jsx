import { PageHeader } from "@/components/shared/page-header";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="Checkout" crumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <div className="container-page py-10">
        <CheckoutClient />
      </div>
    </>
  );
}
