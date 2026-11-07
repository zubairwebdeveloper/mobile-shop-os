import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  className,
}) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>

            <h3 className="mt-2 text-2xl font-bold tracking-tight">
              {value ?? "—"}
            </h3>

            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {Icon && (
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Icon className="size-5" />
            </div>
          )}
        </div>

        {trend !== undefined && trend !== null && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            {isPositive ? (
              <TrendingUp className="size-4 text-emerald-500" />
            ) : isNegative ? (
              <TrendingDown className="size-4 text-red-500" />
            ) : (
              <Minus className="size-4 text-muted-foreground" />
            )}

            <span
              className={cn(
                "font-medium",
                isPositive && "text-emerald-500",
                isNegative && "text-red-500",
                !isPositive && !isNegative && "text-muted-foreground",
              )}
            >
              {Math.abs(trend)}%
            </span>

            {trendLabel && (
              <span className="text-muted-foreground">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
