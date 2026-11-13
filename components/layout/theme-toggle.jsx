"use client";

import { useEffect, useState } from "react";
import { Check, Laptop, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    value: "light",
    label: "Light",
    description: "Clean and bright appearance",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your device settings",
    icon: Laptop,
  },
];

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = theme || "system";

  const ActiveIcon = !mounted ? Palette : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change appearance"
        title="Change appearance"
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: "icon",
          }),
          "group relative size-10 rounded-xl border border-transparent transition-all duration-300 hover:border-border hover:bg-accent hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <ActiveIcon className="size-[19px] transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />

        <span className="sr-only">Change theme</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[280px] rounded-2xl border border-border/70 bg-popover/95 p-2 shadow-2xl backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Palette className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Appearance</p>
            <p className="text-xs text-muted-foreground">
              Customize your experience
            </p>
          </div>
        </div>

        <DropdownMenuSeparator className="my-2" />

        {/* Theme Options */}
        <DropdownMenuGroup>
          {OPTIONS.map(({ value, label, description, icon: Icon }) => {
            const isActive = mounted && activeTheme === value;

            return (
              <DropdownMenuItem
                key={value}
                onSelect={() => setTheme(value)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 outline-none transition-all duration-200",
                  "focus:bg-accent",
                  isActive && "bg-primary/10 text-primary focus:bg-primary/15",
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors",
                    isActive && "bg-primary/15 text-primary",
                  )}
                >
                  <Icon className="size-[18px]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{label}</p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                  </p>
                </div>

                <div className="flex size-5 items-center justify-center">
                  {isActive && <Check className="size-4 text-primary" />}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2" />

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            CURRENT THEME
          </span>

          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold capitalize">
            {mounted ? activeTheme : "Loading"}
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
