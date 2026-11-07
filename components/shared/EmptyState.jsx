import { Inbox } from "lucide-react";

export default function EmptyState({
  title = "No data available",
  description = "There is nothing to display here yet.",
  icon: Icon = Inbox,
  action,
  className = "",
}) {
  return (
    <div
      className={`flex min-h-[260px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
