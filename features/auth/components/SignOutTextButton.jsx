"use client";

import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { signOutSession } from "../client";
import { clearTenantContext } from "@/store/slices/tenantSlice";

export default function SignOutTextButton() {
  const router = useRouter();
  const dispatch = useDispatch();

  async function onSignOut() {
    await signOutSession();
    dispatch(clearTenantContext());
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={onSignOut}>
      Sign out
    </Button>
  );
}
