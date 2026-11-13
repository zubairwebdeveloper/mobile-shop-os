import { StoreShell } from "@/components/layout/store-shell";

// Account area shell. Customer authentication is added in the Firebase phase;
// for now the wishlist is device-local and nothing here requires a login.
export default function AccountLayout({ children }) {
  return <StoreShell>{children}</StoreShell>;
}
