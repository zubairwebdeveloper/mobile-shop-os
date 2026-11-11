import { AnnouncementBar } from "@/components/layout/announcement-bar";

// Public storefront shell. Koi auth / redirect yahan nahi hai.
export default function StoreLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}
