import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ThemeToggle from "@/components/navigation/ThemeToggle";
import BrandMark from "@/components/shared/BrandMark";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export const metadata = {
  title: { default: "Platform admin", template: "%s | Platform admin" },
  robots: { index: false, follow: false },
};

/**
 * Minimal platform admin frame (the full control center is Phase 4).
 * Non-admins get a 404 so the area's existence is not advertised. Every page and API route
 * re-checks requirePlatformAdmin(); this layout is only a convenience gate.
 */
export default async function PlatformLayout({ children }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const adminSnap = await adminDb().doc(`platformAdmins/${user.uid}`).get();
  if (!adminSnap.exists) notFound();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-6 md:px-6">
      <header className="mb-8 flex items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <BrandMark className="size-8" />
          <span className="font-heading text-lg font-semibold">Platform admin</span>
        </div>
        <nav aria-label="Platform" className="flex items-center gap-4 text-sm">
          <Link href="/platform/applications" className="underline-offset-4 hover:underline">
            Applications
          </Link>
          <ThemeToggle />
        </nav>
      </header>
      {children}
    </div>
  );
}
