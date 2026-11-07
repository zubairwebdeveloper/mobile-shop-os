import Link from "next/link";
import { Bell } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLowStock } from "@/lib/inventory/queries";
import { getActiveTenantContext } from "@/lib/tenant/active";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await getActiveTenantContext();
  const lowStock = await getLowStock(ctx);

  return (
    <>
      <PageHeader title="Notifications" description="Alerts are worked out from live data each time you open this page. Other alert types arrive with their modules." />
      {lowStock.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing needs attention" description="No product is at or below its minimum stock." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Low stock ({lowStock.length})</CardTitle>
            <CardDescription>Set the minimum on each product variant. <Link href="/dashboard/purchases" className="underline underline-offset-4">Create a purchase order</Link></CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {lowStock.map((v) => (
                <li key={v.id} className="flex justify-between gap-3 py-2">
                  <Link href={`/dashboard/products/${v.productId}`} className="min-w-0 truncate underline-offset-4 hover:underline">{v.productName} · {v.variantLabel}</Link>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{v.quantity} left (min {v.minStock})</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
