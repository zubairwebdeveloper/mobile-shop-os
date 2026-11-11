"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setMobileNavOpen } from "@/store/slices/ui-slice";
import { MAIN_NAV } from "@/lib/constants/navigation";
import { SITE } from "@/lib/constants/site";
import { Logo } from "@/components/shared/logo";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const dispatch = useDispatch();
  const open = useSelector((state) => state.ui.mobileNavOpen);
  const pathname = usePathname();
  const close = () => dispatch(setMobileNavOpen(false));

  return (
    <Sheet open={open} onOpenChange={(value) => dispatch(setMobileNavOpen(value))}>
      <SheetTrigger
        aria-label="Open menu"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SheetDescription className="sr-only">
            Browse {SITE.shortName} sections
          </SheetDescription>
          <Logo onClick={close} />
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {MAIN_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-3 font-heading text-base font-semibold transition-colors hover:bg-muted",
                  active && "bg-muted text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Need help?</p>
          <p>{SITE.contact.phone}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
