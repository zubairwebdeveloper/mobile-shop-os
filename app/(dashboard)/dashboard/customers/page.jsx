import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import CustomerForm from "@/features/crm/components/CustomerForm";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { searchCustomers } from "@/lib/customers/customers";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }) {
  const ctx = await getActiveTenantContext();
  if (!can(ctx.role, PERMISSIONS.CUSTOMERS_READ)) notFound();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 80) : "";
  const customers = await searchCustomers(ctx, { q: query });

  return (
    <>
      <PageHeader title="Customers" description="Search by name or phone number." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Customers" className="space-y-4">
          <form className="flex gap-2" action="/dashboard/customers">
            <input name="q" defaultValue={query} placeholder="Name or phone" aria-label="Search customers" className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm" />
            <button type="submit" className={buttonVariants({ variant: "outline" })}>Search</button>
          </form>
          {customers.length === 0 ? (
            <EmptyState icon={Users} title={query ? "No match" : "No customers yet"} description={query ? "Try another name or the full phone number." : "Add the first customer on the right, or pick one at the POS."} />
          ) : (
            <Card>
              <CardContent>
                <ul className="divide-y text-sm">
                  {customers.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <Link href={`/dashboard/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">{c.name}{c.vip ? " · VIP" : ""}</Link>
                      <span className="tabular-nums text-muted-foreground">{c.phone}{c.city ? ` · ${c.city}` : ""}{c.status === "ARCHIVED" ? " · archived" : ""}</span>
                    </li>
                  ))}
                </ul>
                {customers.length >= 200 ? <p className="mt-3 text-xs text-muted-foreground">Showing the first 200. Search to narrow down.</p> : null}
              </CardContent>
            </Card>
          )}
        </section>
        {can(ctx.role, PERMISSIONS.CUSTOMERS_WRITE) ? <CustomerForm tenantId={ctx.tenantId} canPrivate={can(ctx.role, PERMISSIONS.CUSTOMERS_PRIVATE_READ)} /> : null}
      </div>
    </>
  );
}
