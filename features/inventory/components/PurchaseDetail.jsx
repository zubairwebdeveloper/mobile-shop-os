"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPkr } from "@/lib/formatters/money";
import { formatUtc } from "@/lib/formatters/date";
import { parseImeiLines, remaining } from "@/lib/inventory/pure";
import { callApi, newKey } from "../api";

const TONE = { DRAFT: "neutral", ORDERED: "warning", PARTIALLY_RECEIVED: "warning", RECEIVED: "success", CANCELLED: "neutral" };

export default function PurchaseDetail({ tenantId, purchase, trackedByVariant, canWrite }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const receivable = purchase.status === "ORDERED" || purchase.status === "PARTIALLY_RECEIVED";
  const [qty, setQty] = useState(() => Object.fromEntries(purchase.items.map((i) => [i.variantId, String(remaining(i))])));
  const [imeiText, setImeiText] = useState({});
  const [receiptKey, setReceiptKey] = useState(newKey); // one key per attempt; a retry of the same attempt cannot double-receive
  const [error, setError] = useState(null);
  const received = purchase.items.some((i) => i.receivedQty > 0);

  const pending = useMemo(() => purchase.items.filter((i) => remaining(i) > 0), [purchase.items]);

  async function act(action) {
    setBusy(true);
    try {
      await callApi(`/api/tenants/${tenantId}/purchases/${purchase.id}`, "PATCH", { action });
      toast.success(action === "ORDER" ? "Marked as ordered." : "Purchase cancelled.");
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function receive(event) {
    event.preventDefault();
    setError(null);
    const lines = pending
      .map((item) => {
        const quantity = Number(qty[item.variantId]);
        return {
          variantId: item.variantId,
          quantity,
          imeis: trackedByVariant[item.variantId] ? parseImeiLines(imeiText[item.variantId]) : [],
        };
      })
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      setError("Enter a quantity for at least one item.");
      return;
    }
    setBusy(true);
    try {
      const result = await callApi(`/api/tenants/${tenantId}/purchases/${purchase.id}/receive`, "POST", { receiptKey, lines });
      toast.success(result.duplicate ? "This receipt was already recorded." : "Goods received.");
      setReceiptKey(newKey());
      setImeiText({});
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-heading text-lg">{purchase.number}</CardTitle>
            <StatusBadge status={purchase.status} tone={TONE[purchase.status]} />
          </div>
          <CardDescription>
            {purchase.supplierName} · receives into {purchase.branchName} · created {formatUtc(purchase.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Item</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Ordered</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Received</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Unit cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchase.items.map((i) => (
                  <tr key={i.variantId}>
                    <td className="px-4 py-2">{i.productName}<span className="block text-xs text-muted-foreground">{i.variantLabel}</span></td>
                    <td className="px-4 py-2 text-right tabular-nums">{i.quantity}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{i.receivedQty}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPkr(i.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm font-medium">Order total: {formatPkr(purchase.totalCost)}</p>
          {purchase.note ? <p className="text-sm text-muted-foreground">Note: {purchase.note}</p> : null}
          {canWrite && purchase.status === "DRAFT" ? (
            <div className="flex gap-2">
              <Button onClick={() => act("ORDER")} disabled={busy}>Mark as ordered</Button>
              <Button variant="outline" onClick={() => act("CANCEL")} disabled={busy}>Cancel order</Button>
            </div>
          ) : null}
          {canWrite && purchase.status === "ORDERED" && !received ? (
            <Button variant="outline" onClick={() => act("CANCEL")} disabled={busy}>Cancel order</Button>
          ) : null}
        </CardContent>
      </Card>

      {canWrite && receivable ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Receive goods</CardTitle>
            <CardDescription>
              Enter what actually arrived. You cannot receive more than ordered. For IMEI-tracked phones, type one IMEI per line (add a second IMEI after a comma for dual SIM).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={receive} className="space-y-5" noValidate>
              {pending.map((item) => (
                <div key={item.variantId} className="space-y-2 border-b pb-4 last:border-0">
                  <div className="flex flex-wrap items-end gap-3">
                    <span className="min-w-0 flex-1 text-sm font-medium">{item.productName} <span className="font-normal text-muted-foreground">({item.variantLabel}) · {remaining(item)} still to receive</span></span>
                    <div>
                      <label htmlFor={`recv-${item.variantId}`} className="mb-1 block text-xs text-muted-foreground">Receive now</label>
                      <Input id={`recv-${item.variantId}`} type="number" min="0" max={remaining(item)} value={qty[item.variantId]} onChange={(e) => setQty((q) => ({ ...q, [item.variantId]: e.target.value }))} className="w-24" />
                    </div>
                  </div>
                  {trackedByVariant[item.variantId] ? (
                    <div>
                      <label htmlFor={`imei-${item.variantId}`} className="mb-1 block text-xs text-muted-foreground">IMEIs ({parseImeiLines(imeiText[item.variantId]).length} entered)</label>
                      <Textarea id={`imei-${item.variantId}`} rows={4} value={imeiText[item.variantId] ?? ""} onChange={(e) => setImeiText((t) => ({ ...t, [item.variantId]: e.target.value }))} placeholder={"490154203237518\n356938035643809, 490154203237518"} className="font-mono text-xs" />
                    </div>
                  ) : null}
                </div>
              ))}
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={busy}>{busy ? "Receiving..." : "Receive goods"}</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
