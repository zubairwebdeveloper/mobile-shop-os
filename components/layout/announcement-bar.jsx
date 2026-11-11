"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { dismissAnnouncement } from "@/store/slices/ui-slice";
import { ANNOUNCEMENT } from "@/lib/constants/site";

export function AnnouncementBar() {
  const dispatch = useDispatch();
  const dismissed = useSelector((state) => state.ui.announcementDismissed);

  if (dismissed) return null;

  return (
    <div className="relative bg-brand-dark text-white">
      <div className="container-page flex min-h-10 items-center justify-center gap-3 py-2 pr-10 text-center text-xs sm:text-sm">
        <span className="text-white/85">{ANNOUNCEMENT.text}</span>
        <Link
          href={ANNOUNCEMENT.cta.href}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {ANNOUNCEMENT.cta.label} &rarr;
        </Link>
      </div>
      <button
        type="button"
        onClick={() => dispatch(dismissAnnouncement())}
        aria-label="Dismiss announcement"
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
