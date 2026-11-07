import Link from "next/link";
import { notFound } from "next/navigation";
import ReconcileForm from "@/features/finance/components/ReconcileForm";
import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listReconciliations } from "@/lib/finance/reports";
import { formatPkr } from "@/lib/formatters/money";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { dayKey } from "@/lib/sales/pure";
import { getActiveTenantContext } from "@/lib/tenant/active";
import { listBranches } from "@/lib/tenant/branches";
import { getShopSettings } from "@/lib/tenant/settings";

export const metadata = { title: "Reconciliation" };
export const dynamic = "force-dynamic";

export default async function ReconciliationPage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.FINANCE_READ)) notFound();
  const sp = await searchParams;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const [{ entries, nextCursor }, branches, shop] = await Promise.all([listReconciliations(ctx, { cursor }), listBranches(ctx), getShopSettings(ctx)]);
  const today = dayKey(new Date(), shop.timezone);
  const mine = branches.filter((b) => b.active && (ctx.allBranches || ctx.branchIds.includes(b.id))).map((b) => ({ id: b.id, name: b.name }));

  return (
    <>
      <PageHeader title="Reconciliation" description="Compare what your records say moved through cash, a bank or a wallet with the statement you hold. You type the statement total; nothing is imported from a bank." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Past reconciliations">
          <Card>
            <CardContent>
              {entries.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
                <ul className="divide-y text-sm">
                  {entries.map((r) => (
                    <li key={r.id} className="py-3 tabular-nums">
                      <span className="font-medium">{r.method.replace(/_/g, " ").toLowerCase()}</span> · {r.from} to {r.to}
                      <span className="block text-xs text-muted-foreground">System {formatPkr(r.systemNet)} · statement {formatPkr(r.statementTotal)} · {r.difference === 0 ? "matches" : `difference ${formatPkr(r.difference)}`}{r.note ? ` · ${r.note}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex gap-2">
                {cursor ? <Link href="/dashboard/reconciliation" className={buttonVariants({ variant: "outline" })}>Back to newest</Link> : null}
                {nextCursor ? <Link href={`/dashboard/reconciliation?cursor=${encodeURIComponent(nextCursor)}`} className={buttonVariants({ variant: "outline" })}>Older</Link> : null}
              </div>
            </CardContent>
          </Card>
        </section>
        {can(ctx.role, PERMISSIONS.FINANCE_WRITE) ? <ReconcileForm tenantId={ctx.tenantId} branches={mine} allBranches={ctx.allBranches} from={`${today.slice(0, 7)}-01`} to={today} /> : null}
      </div>
    </>
  );
}
