import { PageHeader } from "@/components/shared/page-header";
import { CartClient } from "@/components/cart/cart-client";

export const metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <>
      <PageHeader title="Shopping cart" crumbs={[{ label: "Cart" }]} />
      <div className="container-page py-10">
        <CartClient />
      </div>
    </>
  );
}
