import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/shared/AuthCard";
import { buttonVariants } from "@/components/ui/button";
import AcceptInvitationList from "@/features/team/components/AcceptInvitationList";
import { getSessionUser } from "@/lib/auth/session";
import { listMyInvitations } from "@/lib/tenant/members";

export const metadata = { title: "Invitations" };

export default async function InvitationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");

  const invitations = await listMyInvitations(user);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
      <AuthCard
        title="Shop invitations"
        description={invitations.length > 0 ? `Invitations sent to ${user.email}.` : "You have no pending invitations."}
      >
        {invitations.length > 0 ? (
          <AcceptInvitationList invitations={invitations} />
        ) : (
          <Link href="/dashboard" className={buttonVariants()}>
            Continue
          </Link>
        )}
      </AuthCard>
    </main>
  );
}
