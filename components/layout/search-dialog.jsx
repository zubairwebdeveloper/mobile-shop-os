"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["iPhone", "Samsung", "Xiaomi", "Power bank", "Refurbished"];

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function go(term) {
    const q = term.trim();
    setOpen(false);
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger aria-label="Search" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
        <Search className="size-[18px]" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Search products</DialogTitle>
          <DialogDescription>Find phones, tablets and accessories by name or brand.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(query);
          }}
          className="flex gap-2"
          role="search"
        >
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. Galaxy S25"
            aria-label="Search products"
          />
          <Button type="submit">Search</Button>
        </form>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Popular searches</p>
          <ul className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => go(s)}
                  className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
          <Link href="/shop" onClick={() => setOpen(false)} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            Browse the full shop
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
