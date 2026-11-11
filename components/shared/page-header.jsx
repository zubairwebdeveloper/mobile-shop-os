import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({ title, description, crumbs = [], children }) {
  return (
    <div className="border-b bg-[radial-gradient(60%_100%_at_20%_0%,rgb(37_99_235/0.08),transparent)]">
      <div className="container-page py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-1">
              <ChevronRight className="size-3.5" />
              {c.href ? (
                <Link href={c.href} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-semibold text-foreground">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-muted-foreground sm:text-lg">{description}</p>}
        {children}
      </div>
    </div>
  );
}
