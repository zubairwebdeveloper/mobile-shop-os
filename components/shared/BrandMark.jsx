import Link from "next/link";
import { Store } from "lucide-react";

export default function BrandMark({
  name = "Mobile Shop OS",
  tagline = "Smart Business Management",
  href = "/",
  showTagline = true,
  className = "",
}) {
  return (
    <Link
      href={href}
      aria-label={`${name} home`}
      className={`inline-flex w-fit items-center gap-3 transition-opacity hover:opacity-80 ${className}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Store className="h-6 w-6" strokeWidth={2.2} />
      </div>

      <div className="flex flex-col">
        <span className="text-base font-bold tracking-tight text-foreground">
          {name}
        </span>

        {showTagline && (
          <span className="text-xs text-muted-foreground">{tagline}</span>
        )}
      </div>
    </Link>
  );
}
