"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { signOutSession } from "@/features/auth/client";
import { clearTenantContext } from "@/store/slices/tenantSlice";

export default function SignOutButton() {
  const router = useRouter();
  const dispatch = useDispatch();

  async function onSignOut() {
    await signOutSession();
    dispatch(clearTenantContext()); // never keep tenant-scoped state after sign-out
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Sign out" onClick={onSignOut}>
      <LogOut className="size-4" aria-hidden="true" />
    </Button>
  );
}
