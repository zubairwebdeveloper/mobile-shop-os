import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/shared/AuthCard";
import { buttonVariants } from "@/components/ui/button";
import ApplicationForm from "@/features/onboarding/components/ApplicationForm";
import { getSessionUser } from "@/lib/auth/session";
import { resolveActiveTenant } from "@/lib/tenant/context";
import { getUserApplication } from "@/lib/tenant/onboarding";

export const metadata = { title: "Shop application" };

/**
 * Single onboarding page that renders the right step on the server:
 * not signed in -> login; unverified -> verify-email; already in a shop -> dashboard;
 * otherwise the application form / pending / rejected / approved state.
 */
export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");

  const { tenants } = await resolveActiveTenant(user.uid, undefined);
  if (tenants.length > 0) redirect("/dashboard");

  const application = await getUserApplication(user.uid);

  let content;
  if (!application || application.status === "REJECTED") {
    content = (
      <AuthCard
        className="max-w-xl"
        title="Apply for your shop"
        description="Step 3 of 3: tell us about your shop. A platform administrator reviews every application."
      >
        {application?.status === "REJECTED" ? (
          <div role="status" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">Your previous application was not approved.</p>
            {application.rejectionReason ? (
              <p className="mt-1 text-muted-foreground">Reason: {application.rejectionReason}</p>
            ) : null}
            <p className="mt-1 text-muted-foreground">You can correct the details and apply again.</p>
          </div>
        ) : null}
        <ApplicationForm defaultOwnerName="" />
      </AuthCard>
    );
  } else if (application.status === "PENDING") {
    content = (
      <AuthCard
        title="Application under review"
        description={`We received the application for "${application.shopName}". You will be able to open your dashboard as soon as it is approved.`}
      >
        <p className="text-sm text-muted-foreground">
          Review is done by a person, so it can take some time. You can close this page and sign in again later.
        </p>
      </AuthCard>
    );
  } else {
    // APPROVED but the membership index is not visible yet (should be atomic, so this is rare)
    content = (
      <AuthCard title="Your shop is ready" description="Your application was approved.">
        <Link href="/dashboard" className={buttonVariants()}>
          Open dashboard
        </Link>
      </AuthCard>
    );
  }

  return <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4 py-10">{content}</main>;
}
