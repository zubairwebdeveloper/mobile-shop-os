import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/shared/AuthCard";
import RegisterForm from "@/features/auth/components/RegisterForm";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Create account" };


export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(user.emailVerified ? "/dashboard" : "/verify-email");

  return (
    <AuthCard
      title="Create your account"
      description="Step 1 of 3: account. Next you verify your email, then apply for your shop."
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
