"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, ShoppingBag, User } from "lucide-react";
import { MAIN_NAV } from "@/lib/constants/navigation";
import { Logo } from "@/components/shared/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchDialog } from "@/components/layout/search-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MegaMenu } from "@/components/navigation/mega-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Wishlist / cart functionality Phase 03 mein aayegi.
const ACTIONS = [
  { label: "Wishlist", href: "/account/wishlist", icon: Heart, hideOnMobile: true },
  { label: "Cart", href: "/cart", icon: ShoppingBag, hideOnMobile: false },
  { label: "Account", href: "/login", icon: User, hideOnMobile: true },
];

export function Navbar() {
  const pathname = usePathname();
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaPath, setMegaPath] = useState(pathname);
  const headerRef = useRef(null);

  // Route change par mega menu band (render-time state adjustment, no effect needed).
  if (megaPath !== pathname) {
    setMegaPath(pathname);
    setMegaOpen(false);
  }

  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e) => e.key === "Escape" && setMegaOpen(false);
    const onClick = (e) => headerRef.current && !headerRef.current.contains(e.target) && setMegaOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [megaOpen]);

  return (
    <header
      ref={headerRef}
      onMouseLeave={() => setMegaOpen(false)}
      className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75"
    >
      <div className="container-page flex  h-16 items-center gap-2 lg:gap-8">
        <MobileNav />
        <Logo className="mr-auto lg:mr-0" />

        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {MAIN_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const cls = cn(
              "relative inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground",
              (active || (item.mega && megaOpen)) && "text-foreground",
            );
            const underline = active && (
              <span className="absolute inset-x-3 -bottom-[17px] h-0.5 rounded-full bg-primary" />
            );

            if (item.mega) {
              return (
                <div key={item.href} className="flex items-center" onMouseEnter={() => setMegaOpen(true)}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={cls}>
                    {item.label}
                    {underline}
                  </Link>
                  <button
                    type="button"
                    aria-label="Toggle shop menu"
                    aria-expanded={megaOpen}
                    aria-controls="mega-menu"
                    onClick={() => setMegaOpen((v) => !v)}
                    className="-ml-2 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", megaOpen && "rotate-180")} />
                  </button>
                </div>
              );
            }
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cls}>
                {item.label}
                {underline}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-0.5">
          <SearchDialog />
          {ACTIONS.map(({ label, href, icon: Icon, hideOnMobile }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), hideOnMobile && "hidden sm:inline-flex")}
            >
              <Icon className="size-[18px]" />
            </Link>
          ))}
          <ThemeToggle />
        </div>
      </div>

      {megaOpen && (
        <div
          id="mega-menu"
          className="absolute inset-x-0 top-full hidden border-b bg-popover shadow-soft animate-in fade-in-0 slide-in-from-top-2 lg:block"
        >
          <div className="container-page">
            <MegaMenu onNavigate={() => setMegaOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
