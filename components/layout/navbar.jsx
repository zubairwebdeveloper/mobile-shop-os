"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { ArrowUpRight, ChevronDown, Sparkles } from "lucide-react";

import { MAIN_NAV } from "@/lib/constants/navigation";

import { Logo } from "@/components/shared/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { HeaderActions } from "@/components/layout/header-actions";
import { SearchDialog } from "@/components/layout/search-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MegaMenu } from "@/components/navigation/mega-menu";

import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  const [megaOpen, setMegaOpen] = useState(false);

  const headerRef = useRef(null);

  // Active route detection
  const isActive = (href) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  // Close menu when route changes
  useEffect(() => {
    setMegaOpen(false);
  }, [pathname]);

  // Keyboard and outside click handling
  useEffect(() => {
    if (!megaOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMegaOpen(false);
      }
    };

    const handleOutsideClick = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMegaOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [megaOpen]);

  return (
    <header
      ref={headerRef}
      onMouseLeave={() => setMegaOpen(false)}
      className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 shadow-sm backdrop-blur-2xl supports-[backdrop-filter]:bg-background/75"
    >
      {/* Main Navbar */}
      <div className="container-page relative flex h-16 items-center gap-2 lg:h-[76px] lg:gap-7">
        {/* Mobile Navigation */}
        <div className="flex shrink-0 items-center lg:hidden">
          <MobileNav />
        </div>

        {/* Logo */}
        <div className="flex shrink-0 items-center">
          <Logo className="mr-auto transition-transform duration-300 hover:scale-[1.03] lg:mr-0" />
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1"
        >
          {MAIN_NAV.map((item) => {
            const active = isActive(item.href);

            const isMegaActive = item.mega && megaOpen;

            const linkClass = cn(
              "group relative inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold tracking-tight transition-colors duration-300 xl:px-4 xl:text-sm",
              active || isMegaActive
                ? "text-primary"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            );

            // Mega menu navigation item
            if (item.mega) {
              return (
                <div
                  key={item.href}
                  className="relative flex items-center"
                  onMouseEnter={() => setMegaOpen(true)}
                  onFocus={() => setMegaOpen(true)}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(linkClass, "pr-1.5")}
                  >
                    <span className="relative z-10">{item.label}</span>

                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 transition-transform duration-300",
                        megaOpen && "rotate-180",
                      )}
                    />

                    {/* Active underline */}
                    {active && (
                      <motion.span
                        layoutId="navbar-active-indicator"
                        className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-primary"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </Link>

                  {/* Dropdown Toggle */}
                  <button
                    type="button"
                    aria-label="Toggle shop menu"
                    aria-expanded={megaOpen}
                    aria-controls="mega-menu"
                    onClick={() => setMegaOpen((value) => !value)}
                    className="mr-1 rounded-lg p-2 text-muted-foreground transition-all duration-300 hover:bg-primary/10 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-300",
                        megaOpen && "rotate-180",
                      )}
                    />
                  </button>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={linkClass}
              >
                <span className="relative z-10">{item.label}</span>

                {/* Animated Arrow */}
                <ArrowUpRight
                  className={cn(
                    "size-3.5 shrink-0 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100",
                    active && "text-primary",
                  )}
                />

                {/* Active Indicator */}
                {active && (
                  <motion.span
                    layoutId="navbar-active-indicator"
                    className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded-full bg-primary"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}

                {/* Hover Underline */}
                {!active && (
                  <span className="absolute inset-x-3 bottom-1 h-[2px] origin-left scale-x-0 rounded-full bg-primary/60 transition-transform duration-300 group-hover:scale-x-100" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 lg:ml-0">
          {/* Search */}
          <div className="rounded-xl transition-colors duration-300 hover:bg-muted/80">
            <SearchDialog />
          </div>

          {/* Cart and Wishlist */}
          <div className="rounded-xl transition-colors duration-300 hover:bg-muted/80">
            <HeaderActions />
          </div>

          {/* Theme Toggle */}
          <div className="rounded-xl transition-colors duration-300 hover:bg-muted/80">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Animated Mega Menu */}
      <AnimatePresence>
        {megaOpen && (
          <motion.div
            id="mega-menu"
            key="mega-menu"
            initial={{
              opacity: 0,
              y: -12,
              scale: 0.99,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: -8,
              scale: 0.99,
            }}
            transition={{
              duration: 0.22,
              ease: "easeOut",
            }}
            className="absolute inset-x-0 top-full hidden border-b border-border/70 bg-popover/95 shadow-xl backdrop-blur-2xl lg:block"
          >
            {/* Top Decorative Border */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="container-page">
              <div className="py-5">
                {/* Mega Menu Heading */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles className="size-4 text-primary" />
                  </div>

                  <div>
                    <p className="text-sm font-bold">Explore Our Collection</p>

                    <p className="text-xs text-muted-foreground">
                      Discover products and find your perfect device.
                    </p>
                  </div>
                </div>

                {/* Existing Mega Menu */}
                <MegaMenu onNavigate={() => setMegaOpen(false)} />
              </div>
            </div>

            {/* Bottom Decorative Line */}
            <div className="h-0.5 w-full bg-primary/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
