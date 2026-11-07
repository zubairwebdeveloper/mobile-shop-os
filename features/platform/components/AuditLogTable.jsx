import { formatUtc } from "@/lib/formatters/date";

const LABELS = {
  TENANT_APPLICATION_SUBMITTED: "Application submitted",
  TENANT_APPLICATION_APPROVED: "Application approved",
  TENANT_APPLICATION_REJECTED: "Application rejected",
  TENANT_SUSPENDED: "Shop suspended",
  TENANT_REACTIVATED: "Shop reactivated",
  TENANT_SUBSCRIPTION_UPDATED: "Subscription updated",
  PLAN_CREATED: "Plan created",
  PLAN_UPDATED: "Plan updated",
  PLATFORM_ADMIN_BOOTSTRAPPED: "Platform admin created",
  TENANT_CREATED: "Shop created",
  BRANCH_CREATED: "Branch created",
  BRANCH_UPDATED: "Branch updated",
};

export const actionLabel = (action) =>
  LABELS[action] ?? String(action).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Server-renderable table of audit entries (also used for tenant activity). */
export default function AuditLogTable({ entries, compact = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="py-2 pe-4 font-medium">When</th>
            <th scope="col" className="py-2 pe-4 font-medium">Action</th>
            {!compact ? <th scope="col" className="py-2 pe-4 font-medium">Target</th> : null}
            {!compact ? <th scope="col" className="py-2 pe-4 font-medium">By</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="whitespace-nowrap py-2 pe-4 tabular-nums text-muted-foreground">{formatUtc(entry.createdAt)}</td>
              <td className="py-2 pe-4">
                <span className="font-medium">{actionLabel(entry.action)}</span>
                {entry.reason ? <span className="block text-xs text-muted-foreground">Reason: {entry.reason}</span> : null}
              </td>
              {!compact ? (
                <td className="py-2 pe-4 font-mono text-xs">
                  {entry.targetType ? `${entry.targetType}:${entry.targetId ?? "—"}` : "—"}
                </td>
              ) : null}
              {!compact ? <td className="py-2 pe-4 font-mono text-xs">{entry.actorUid ?? "system"}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
