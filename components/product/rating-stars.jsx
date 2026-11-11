import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({ rating, count, className, size = "size-3.5" }) {
  const rounded = Math.round(rating);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(size, i <= rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
          />
        ))}
      </span>
      <span className="text-xs font-semibold">{rating.toFixed(1)}</span>
      {count != null && <span className="text-xs text-muted-foreground">({count})</span>}
      <span className="sr-only">Rated {rating.toFixed(1)} out of 5</span>
    </div>
  );
}
