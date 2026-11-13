"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { GitCompareArrows, Heart, ShoppingBag, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

function Badge({ count }) {
  if (!count) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] leading-[18px] font-bold text-primary-foreground"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function HeaderActions() {
  const ready = useHydrated();
  const cartCount = useSelector((s) => (ready && s.cart.hydrated ? s.cart.items.reduce((n, i) => n + i.qty, 0) : 0));
  const wishCount = useSelector((s) => (ready && s.wishlist.hydrated ? s.wishlist.ids.length : 0));
  const compareCount = useSelector((s) => (ready && s.comparison.hydrated ? s.comparison.slots.filter(Boolean).length : 0));

  const actions = [
    { label: "Compare", href: "/compare", icon: GitCompareArrows, count: compareCount, hideOnMobile: true },
    { label: "Wishlist", href: "/account/wishlist", icon: Heart, count: wishCount, hideOnMobile: true },
    { label: "Cart", href: "/cart", icon: ShoppingBag, count: cartCount, hideOnMobile: false },
    { label: "Account", href: "/login", icon: User, count: 0, hideOnMobile: true },
  ];

  return (
    <>
      {actions.map(({ label, href, icon: Icon, count, hideOnMobile }) => (
        <Link
          key={label}
          href={href}
          aria-label={count ? `${label} (${count})` : label}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "relative",
            hideOnMobile && "hidden sm:inline-flex",
          )}
        >
          <Icon className="size-[18px]" />
          <Badge count={count} />
        </Link>
      ))}
    </>
  );
}
