import { Badge } from "@/components/ui/badge";
import { discountPercent, formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function PriceTag({ price, compareAtPrice, size = "md", className }) {
  const off = discountPercent(price, compareAtPrice);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-display font-bold tracking-tight",
          size === "lg" ? "text-3xl" : "text-lg",
        )}
      >
        {formatPrice(price)}
      </span>
      {off > 0 && (
        <>
          <span className={cn("text-muted-foreground line-through", size === "lg" ? "text-base" : "text-xs")}>
            {formatPrice(compareAtPrice)}
          </span>
          <Badge variant="mint">{off}% off</Badge>
        </>
      )}
    </div>
  );
}
