import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/shared/AuthCard";
import { buttonVariants } from "@/components/ui/button";
import SignOutTextButton from "@/features/auth/components/SignOutTextButton";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Shop suspended" };

export default async function SuspendedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
      <AuthCard
        title="This shop is suspended"
        description="Access to this shop's data is paused. Nothing has been deleted. Please contact the platform administrator to restore access."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className={buttonVariants()}>
            Try again
          </Link>
          <SignOutTextButton />
        </div>
      </AuthCard>
    </main>
  );
}
