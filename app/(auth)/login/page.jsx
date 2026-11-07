import Link from "next/link";
import { redirect } from "next/navigation";
import AuthCard from "@/components/shared/AuthCard";
import LoginForm from "@/features/auth/components/LoginForm";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back to Mobile Shop OS."
      footer={
        <>
          <Link
            href="/forgot-password"
            className="underline underline-offset-4"
          >
            Forgot your password?
          </Link>
          <span>
            New here?{" "}
            <Link href="/register" className="underline underline-offset-4">
              Create an account
            </Link>
          </span>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
