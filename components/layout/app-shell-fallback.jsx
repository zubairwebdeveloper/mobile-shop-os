import { Skeleton } from "@/components/ui/skeleton";

// Static shell jo prerender hota hai; asli app (Redux store ke saath) uske baad stream hoti hai.
export function AppShellFallback() {
  return (
    <div className="flex min-h-dvh flex-col" role="status" aria-label="Loading ZUBAIR MOBILE">
      <div className="h-10 bg-brand-dark" />
      <div className="border-b">
        <div className="container-page flex h-16 items-center gap-4">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="ml-auto h-9 w-40" />
        </div>
      </div>
      <div className="container-page flex-1 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 rounded-full" />
            <Skeleton className="h-14 w-full max-w-md" />
            <Skeleton className="h-14 w-4/5 max-w-sm" />
            <Skeleton className="h-5 w-full max-w-lg" />
          </div>
          <Skeleton className="mx-auto aspect-[4/5] w-full max-w-sm rounded-3xl" />
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
