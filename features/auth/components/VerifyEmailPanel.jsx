"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirmEmailVerified, resendVerificationEmail, signOutSession } from "../client";
import { authErrorMessage } from "../errors";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPanel({ email }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onResend() {
    setBusy(true);
    setMessage(null);
    try {
      await resendVerificationEmail();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Verification email sent.");
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await confirmEmailVerified();
      if (result === "VERIFIED") {
        router.replace("/onboarding");
        router.refresh();
      } else if (result === "SIGN_IN_AGAIN") {
        router.replace("/login");
        router.refresh();
      } else {
        setMessage("We could not see a verified email yet. Click the link in the email, then try again.");
      }
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    await signOutSession();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        We sent a verification link to <strong className="break-all">{email}</strong>. Open it, then come back
        and continue.
      </p>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onConfirm} disabled={busy}>
          I have verified my email
        </Button>
        <Button variant="outline" onClick={onResend} disabled={busy || cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
        </Button>
      </div>
      <Button variant="link" className="h-auto p-0" onClick={onSignOut}>
        Use a different account
      </Button>
    </div>
  );
}
