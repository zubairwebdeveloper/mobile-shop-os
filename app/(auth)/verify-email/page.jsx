import { redirect } from "next/navigation";
import AuthCard from "@/components/shared/AuthCard";
import VerifyEmailPanel from "@/features/auth/components/VerifyEmailPanel";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/onboarding");

  return (
    <AuthCard title="Verify your email" description="Step 2 of 3: confirm that this email address is yours.">
      <VerifyEmailPanel email={user.email ?? "your email address"} />
    </AuthCard>
  );
}
