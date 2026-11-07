"use client";

import { Menu, Search } from "lucide-react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { setCommandOpen, setMobileNavOpen } from "@/store/slices/uiSlice";
import BranchSelector from "./BranchSelector";
import Breadcrumbs from "./Breadcrumbs";
import SignOutButton from "./SignOutButton";
import ThemeToggle from "./ThemeToggle";

export default function AppHeader() {
  const dispatch = useDispatch();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => dispatch(setMobileNavOpen(true))}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <BranchSelector />
      <Button
        variant="outline"
        className="hidden h-9 w-56 justify-between text-muted-foreground sm:flex"
        onClick={() => dispatch(setCommandOpen(true))}
        aria-label="Open command menu"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" aria-hidden="true" />
          Search
        </span>
        <kbd className="rounded border bg-muted px-1.5 text-[10px] font-medium">Ctrl K</kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        aria-label="Open command menu"
        onClick={() => dispatch(setCommandOpen(true))}
      >
        <Search className="size-5" aria-hidden="true" />
      </Button>

      <ThemeToggle />
      <SignOutButton />
    </header>
  );
}
