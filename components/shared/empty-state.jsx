import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, href, actionLabel }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed px-6 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-8" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {href && (
        <Link href={href} className={cn(buttonVariants({ size: "lg" }), "mt-7")}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
