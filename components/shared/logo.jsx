import Link from "next/link";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, onClick, onDark = false }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="ZUBAIR MOBILE home"
      className={cn(
        "group inline-flex items-center gap-2.5",
        onDark && "text-white",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl text-white shadow-soft transition-transform group-hover:-rotate-6",
          onDark ? "bg-primary" : "bg-brand-dark dark:bg-primary",
        )}
      >
        <Smartphone className="size-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[17px] font-bold tracking-[0.12em]">ZUBAIR</span>
        <span className="mt-0.5 font-display text-[10px] font-medium tracking-[0.42em] text-accent">
          MOBILE
        </span>
      </span>
    </Link>
  );
}
