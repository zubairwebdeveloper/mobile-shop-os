import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { cn } from "@/lib/utils";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="container-page grid flex-1 place-items-center py-20 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <SearchX className="size-8" />
          </span>
          <p className="mt-6 font-display text-6xl font-bold text-gradient-brand">404</p>
          <h1 className="mt-3 text-2xl font-extrabold">Page not found</h1>
          <p className="mt-2 text-muted-foreground">
            Ye page abhi available nahi hai ya move ho chuka hai. Baqi pages aglay phases mein aayenge.
          </p>
          <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
            <ArrowLeft /> Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
