import { Skeleton } from "@/components/ui/skeleton";

// Dynamic route ke params resolve hone tak instant shell. `variant` grid ya detail layout choose karta hai.
export function PageSkeleton({ variant = "grid" }) {
  return (
    <div role="status" aria-label="Loading page">
      <div className="border-b">
        <div className="container-page space-y-4 py-10 sm:py-14">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-72 max-w-full sm:h-12" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
      </div>
      <div className="container-page py-10">
        {variant === "detail" ? (
          <div className="grid gap-10 lg:grid-cols-2">
            <Skeleton className="aspect-[5/6] w-full rounded-3xl" />
            <div className="space-y-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-4/5" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-60" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        )}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
