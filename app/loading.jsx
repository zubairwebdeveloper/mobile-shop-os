import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-16" role="status" aria-label="Loading">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-14 w-full max-w-md" />
          <Skeleton className="h-14 w-4/5 max-w-sm" />
          <Skeleton className="h-5 w-full max-w-lg" />
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 w-36 rounded-xl" />
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>
        </div>
        <Skeleton className="mx-auto aspect-[4/5] w-full max-w-sm rounded-3xl" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
