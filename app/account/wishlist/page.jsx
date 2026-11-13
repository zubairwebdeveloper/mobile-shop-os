import { PageHeader } from "@/components/shared/page-header";
import { WishlistClient } from "@/components/wishlist/wishlist-client";

export const metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <>
      <PageHeader title="My wishlist" description="Products you saved on this device." crumbs={[{ label: "Wishlist" }]} />
      <div className="container-page py-10">
        <WishlistClient />
      </div>
    </>
  );
}
