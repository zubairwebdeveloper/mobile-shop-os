"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatPkr } from "@/lib/formatters/money";
import { classifyCode, matchesQuery, rupeesToPaisa } from "@/lib/catalog/pure";
import { computeSale, settlePayments, taxPercentToBps } from "@/lib/sales/pure";
import { callApi, newKey } from "@/features/inventory/api";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer (record)" },
  { value: "JAZZCASH", label: "JazzCash (record)" },
  { value: "EASYPAISA", label: "Easypaisa (record)" },
  { value: "EXCHANGE_CREDIT", label: "Exchange credit" },
];

const EMPTY = { customerName: "", customerPhone: "", note: "", taxPercent: "0", orderDiscount: "0", items: [], payments: [{ method: "CASH", amount: "", reference: "", exchangeId: "" }] };
const num = (v) => (/^\d+$/.test(String(v ?? "").trim()) ? Number(v) : 0);

/**
 * Touch-friendly POS. The totals shown here are a PREVIEW using the same pure rules as the server; the server
 * recalculates every price from the catalogue and is the only authority. Payment methods other than cash are
 * records of money received elsewhere (no payment gateway is connected).
 */
export default function PosTerminal({ tenantId, branches }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [catalog, setCatalog] = useState({ items: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [devices, setDevices] = useState({});
  const [credits, setCredits] = useState([]);
  const [formError, setFormError] = useState(null);
  const [done, setDone] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState([]);
  const lastSubmit = useRef({ payload: "", key: "" });

  const form = useForm({ defaultValues: EMPTY });
  const { fields: lines, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { fields: payRows, append: addPay, remove: removePay } = useFieldArray({ control: form.control, name: "payments" });
  const watched = useWatch({ control: form.control });

  const byVariant = useMemo(() => new Map(catalog.items.map((i) => [i.variantId, i])), [catalog]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setCatalog(await callApi(`/api/tenants/${tenantId}/pos/catalog?branchId=${encodeURIComponent(branchId)}`, "GET"));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, branchId]);

  useEffect(() => {
    if (branchId) loadCatalog();
  }, [branchId, loadCatalog]);

  useEffect(() => {
    callApi(`/api/tenants/${tenantId}/exchange-credits`, "GET").then((r) => setCredits(r.credits)).catch(() => setCredits([]));
  }, [tenantId, done]);

  async function findCustomers() {
    try {
      const r = await callApi(`/api/tenants/${tenantId}/customers?q=${encodeURIComponent(customerQuery.trim())}&limit=8`, "GET");
      setCustomerHits(r.customers.filter((c) => c.status !== "ARCHIVED"));
      if (r.customers.length === 0) toast.message("No customer found. You can type a name and phone below instead.");
    } catch (error) {
      toast.error(error.message);
    }
  }

  const shown = useMemo(
    () => catalog.items.filter((i) => (!category || i.categoryName === category) && matchesQuery(search, i.productName, i.brandName, i.variantLabel, i.barcode, i.sku)),
    [catalog, search, category]
  );

  async function loadDevices(variantId) {
    try {
      const r = await callApi(`/api/tenants/${tenantId}/pos/imeis?branchId=${encodeURIComponent(branchId)}&variantId=${encodeURIComponent(variantId)}`, "GET");
      setDevices((d) => ({ ...d, [variantId]: r.devices }));
    } catch (error) {
      toast.error(error.message);
    }
  }

  function addItem(item, imei) {
    const rows = form.getValues("items");
    const at = rows.findIndex((r) => r.variantId === item.variantId);
    if (item.tracksImei) {
      if (at >= 0) {
        if (imei) toggleImei(at, imei);
        return;
      }
      append({ variantId: item.variantId, quantity: imei ? "1" : "0", discount: "0", imeis: imei ? [imei] : [] });
      loadDevices(item.variantId);
      return;
    }
    if (at >= 0) {
      const next = num(rows[at].quantity) + 1;
      if (next > item.stock) return void toast.error(`Only ${item.stock} in stock at this branch.`);
      form.setValue(`items.${at}.quantity`, String(next));
      return;
    }
    if (item.stock < 1) return void toast.error("Out of stock at this branch.");
    append({ variantId: item.variantId, quantity: "1", discount: "0", imeis: [] });
  }

  function toggleImei(index, imei) {
    const current = form.getValues(`items.${index}.imeis`);
    const next = current.includes(imei) ? current.filter((x) => x !== imei) : [...current, imei];
    form.setValue(`items.${index}.imeis`, next);
    form.setValue(`items.${index}.quantity`, String(next.length));
  }

  function setQty(index, delta) {
    const row = form.getValues(`items.${index}`);
    const item = byVariant.get(row.variantId);
    const next = num(row.quantity) + delta;
    if (next < 1) return remove(index);
    if (item && next > item.stock) return void toast.error(`Only ${item.stock} in stock at this branch.`);
    form.setValue(`items.${index}.quantity`, String(next));
  }

  async function onScan(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const text = search.trim();
    if (!text) return;
    const { kind, code } = classifyCode(text);
    if (kind === "IMEI") {
      try {
        const r = await callApi(`/api/tenants/${tenantId}/lookup?code=${encodeURIComponent(code)}`, "GET");
        const rec = r.result?.record;
        const item = rec && byVariant.get(rec.variantId);
        if (!item || rec.branchId !== branchId || rec.status !== "IN_STOCK") return void toast.error("That device is not in stock at this branch.");
        addItem(item, rec.imei1);
        setSearch("");
      } catch (error) {
        toast.error(error.message);
      }
      return;
    }
    const exact = catalog.items.filter((i) => i.barcode.toLowerCase() === text.toLowerCase() || i.sku.toLowerCase() === text.toLowerCase());
    if (exact.length === 1) {
      addItem(exact[0]);
      setSearch("");
    } else if (shown.length === 1) {
      addItem(shown[0]);
      setSearch("");
    }
  }

  // ---- preview totals (same pure rules as the server) ----
  const preview = useMemo(() => {
    const rows = watched.items ?? [];
    const priced = rows.map((r) => ({ unitPrice: byVariant.get(r.variantId)?.sellingPrice ?? 0, quantity: num(r.quantity), discount: (rupeesToPaisa(String(num(r.discount))) ?? 0) }));
    if (priced.length === 0 || priced.some((p) => p.quantity < 1)) return null;
    const calc = computeSale({ lines: priced, orderDiscount: rupeesToPaisa(String(num(watched.orderDiscount))) ?? 0, taxBps: taxPercentToBps(watched.taxPercent) ?? 0 });
    return calc.ok ? calc : { error: calc.message };
  }, [watched, byVariant]);

  const settle = useMemo(() => {
    if (!preview?.ok) return null;
    const pays = (watched.payments ?? []).filter((p) => num(p.amount) > 0).map((p) => ({ method: p.method, amount: num(p.amount) * 100, exchangeId: p.exchangeId || "x" }));
    return settlePayments(preview.total, pays, { hasCustomer: Boolean(customer) || ((watched.customerName ?? "").trim().length >= 2 && (watched.customerPhone ?? "").trim().length > 0) });
  }, [preview, watched, customer]);

  const trackedIncomplete = (watched.items ?? []).some((r) => byVariant.get(r.variantId)?.tracksImei && (r.imeis ?? []).length === 0);

  async function onSubmit(values) {
    setFormError(null);
    const payload = {
      branchId,
      ...(customer ? { customerId: customer.id } : {}),
      customerName: customer ? "" : values.customerName.trim(),
      customerPhone: customer ? "" : values.customerPhone.trim(),
      note: values.note.trim(),
      taxPercent: String(values.taxPercent || "0"),
      orderDiscount: String(values.orderDiscount || "0"),
      items: values.items.map((r) => ({ variantId: r.variantId, quantity: num(r.quantity), discount: String(num(r.discount)), imeis: r.imeis })),
      payments: values.payments
        .filter((p) => num(p.amount) > 0)
        .map((p) => ({ method: p.method, amount: String(num(p.amount)), reference: p.reference.trim(), ...(p.method === "EXCHANGE_CREDIT" && p.exchangeId ? { exchangeId: p.exchangeId } : {}) })),
    };
    // Same request body = same key (a retry after a network error never sells twice); a changed cart gets a new key.
    const text = JSON.stringify(payload);
    if (lastSubmit.current.payload !== text) lastSubmit.current = { payload: text, key: newKey() };
    try {
      const r = await callApi(`/api/tenants/${tenantId}/sales`, "POST", { ...payload, saleKey: lastSubmit.current.key });
      toast.success(r.duplicate ? "This sale was already saved." : "Sale completed.");
      setDone({ id: r.id });
      form.reset(EMPTY);
      setDevices({});
      setCustomer(null);
      setCustomerHits([]);
      setCustomerQuery("");
      lastSubmit.current = { payload: "", key: "" };
      loadCatalog();
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (branches.length === 0) {
    return <Card className="max-w-xl"><CardContent className="pt-6 text-sm">You do not have a branch to sell from. Ask the owner to give you branch access.</CardContent></Card>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <section aria-label="Products" className="space-y-3">
        {branches.length > 1 ? (
          <label className="flex items-center gap-2 text-sm font-medium">
            Selling from
            <select
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              value={branchId}
              onChange={(e) => {
                if (form.getValues("items").length > 0) return void toast.error("Finish or clear the cart before changing branch.");
                setBranchId(e.target.value);
              }}
            >
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        ) : null}
        <Input
          autoFocus
          inputMode="search"
          className="h-12 text-base"
          placeholder="Search, or scan a barcode / IMEI and press Enter"
          aria-label="Search products or scan a code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onScan}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          <Button type="button" variant={category === "" ? "default" : "outline"} onClick={() => setCategory("")}>All</Button>
          {catalog.categories.map((c) => (
            <Button key={c} type="button" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>{c}</Button>
          ))}
        </div>
        {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading products...</p> : null}
        {!loading && shown.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No sellable products found. Products need an active status and a selling price.</p> : null}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {shown.slice(0, 60).map((item) => (
            <button
              key={item.variantId}
              type="button"
              onClick={() => addItem(item)}
              disabled={item.stock < 1}
              className="min-h-24 rounded-xl border bg-card p-3 text-left shadow-xs transition hover:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <span className="block text-sm font-medium leading-tight">{item.productName}</span>
              <span className="block text-xs text-muted-foreground">{item.variantLabel}{item.tracksImei ? " · IMEI" : ""}</span>
              <span className="mt-2 block text-sm font-semibold tabular-nums">{formatPkr(item.sellingPrice)}</span>
              <span className="block text-xs text-muted-foreground">{item.stock < 1 ? "Out of stock" : `${item.stock} in stock`}</span>
            </button>
          ))}
        </div>
        {shown.length > 60 ? <p className="text-xs text-muted-foreground">Showing 60 of {shown.length}. Search to narrow down.</p> : null}
      </section>

      <Card className="h-fit xl:sticky xl:top-4">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Cart</CardTitle>
          <CardDescription>Prices come from the catalogue. Discounts and tax are in whole rupees / percent.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div role="status" className="mb-4 rounded-lg border border-emerald-600/40 bg-emerald-600/10 p-3 text-sm">
              Sale saved. <Link href={`/dashboard/sales/${done.id}`} className="font-medium underline">Open invoice</Link>
            </div>
          ) : null}
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {lines.length === 0 ? <p className="text-sm text-muted-foreground">The cart is empty. Tap a product to add it.</p> : null}
              {lines.map((field, index) => {
                const row = watched.items?.[index];
                const item = byVariant.get(row?.variantId);
                if (!item) return null;
                return (
                  <div key={field.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.variantLabel} · {formatPkr(item.sellingPrice)}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => remove(index)} aria-label={`Remove ${item.productName}`}>Remove</Button>
                    </div>
                    {item.tracksImei ? (
                      <fieldset className="space-y-1">
                        <legend className="text-xs font-medium">Choose device(s) by IMEI</legend>
                        {(devices[item.variantId] ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No devices in stock.</p> : null}
                        {(devices[item.variantId] ?? []).map((d) => (
                          <label key={d.id} className="flex min-h-9 items-center gap-2 text-sm">
                            <input type="checkbox" className="size-4" checked={(row?.imeis ?? []).includes(d.imei1)} onChange={() => toggleImei(index, d.imei1)} />
                            <span className="tabular-nums">{d.imei1}</span>
                            {d.condition !== "NEW" ? <span className="text-xs text-muted-foreground">({d.condition.toLowerCase()})</span> : null}
                          </label>
                        ))}
                      </fieldset>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" className="size-10" onClick={() => setQty(index, -1)} aria-label="Decrease quantity">-</Button>
                        <span className="w-10 text-center text-base font-semibold tabular-nums" aria-live="polite">{row?.quantity}</span>
                        <Button type="button" variant="outline" className="size-10" onClick={() => setQty(index, 1)} aria-label="Increase quantity">+</Button>
                      </div>
                    )}
                    <FormField control={form.control} name={`items.${index}.discount`} label="Line discount (PKR)" inputMode="numeric" idPrefix="pos" />
                  </div>
                );
              })}

              <FormField control={form.control} name="orderDiscount" label="Extra discount on the whole sale (PKR)" inputMode="numeric" idPrefix="pos" />
              <FormField control={form.control} name="taxPercent" label="Tax (%)" inputMode="decimal" description="Leave 0 if you do not charge tax." idPrefix="pos" />

              <div className="rounded-lg bg-muted/50 p-3 text-sm tabular-nums" aria-live="polite">
                {preview?.ok ? (
                  <dl className="space-y-1">
                    <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPkr(preview.subtotal)}</dd></div>
                    <div className="flex justify-between"><dt>Discounts</dt><dd>- {formatPkr(preview.lineDiscountTotal + preview.orderDiscount)}</dd></div>
                    <div className="flex justify-between"><dt>Tax</dt><dd>{formatPkr(preview.taxAmount)}</dd></div>
                    <div className="flex justify-between border-t pt-1 text-base font-semibold"><dt>Total</dt><dd>{formatPkr(preview.total)}</dd></div>
                  </dl>
                ) : (
                  <p className="text-muted-foreground">{preview?.error ?? "Add items to see the total."}</p>
                )}
              </div>

              <fieldset className="space-y-3 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">Payment</legend>
                {payRows.map((row, index) => (
                  <div key={row.id} className="grid gap-2 border-b pb-3 last:border-0 last:pb-0">
                    <FormField control={form.control} name={`payments.${index}.method`} label="Method" options={METHODS} idPrefix="pos" />
                    {watched.payments?.[index]?.method === "EXCHANGE_CREDIT" ? (
                      <FormField
                        control={form.control}
                        name={`payments.${index}.exchangeId`}
                        label="Credit to use"
                        options={[{ value: "", label: credits.length ? "Choose..." : "No open credit" }, ...credits.map((c) => ({ value: c.id, label: `${c.returnNumber} · ${formatPkr(c.remaining)} left` }))]}
                        idPrefix="pos"
                      />
                    ) : null}
                    <FormField control={form.control} name={`payments.${index}.amount`} label="Amount (PKR)" inputMode="numeric" idPrefix="pos" />
                    <FormField control={form.control} name={`payments.${index}.reference`} label="Reference (optional)" description="Transaction ID for bank / JazzCash / Easypaisa." idPrefix="pos" />
                    <div className="flex gap-2">
                      {preview?.ok ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => form.setValue(`payments.${index}.amount`, String(Math.ceil(preview.total / 100)))}>Full amount</Button>
                      ) : null}
                      {payRows.length > 1 ? <Button type="button" variant="outline" size="sm" onClick={() => removePay(index)}>Remove</Button> : null}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={payRows.length >= 5} onClick={() => addPay({ method: "BANK_TRANSFER", amount: "", reference: "", exchangeId: "" })}>Split payment</Button>
                {settle ? (
                  <p className="text-sm tabular-nums" aria-live="polite">
                    {settle.ok
                      ? settle.dueAmount > 0
                        ? `Credit sale: ${formatPkr(settle.dueAmount)} unpaid.`
                        : settle.changeGiven > 0 ? `Change to give: ${formatPkr(settle.changeGiven)}` : "Fully paid."
                      : settle.message}
                  </p>
                ) : null}
              </fieldset>

              <fieldset className="space-y-2 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">Customer</legend>
                {customer ? (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span><span className="font-medium">{customer.name}</span> · {customer.phone}{customer.vip ? " · VIP" : ""}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCustomer(null)}>Change</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input aria-label="Find a customer by name or phone" placeholder="Name or phone" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findCustomers(); } }} />
                      <Button type="button" variant="outline" onClick={findCustomers}>Find</Button>
                    </div>
                    {customerHits.map((c) => (
                      <button key={c.id} type="button" className="block w-full rounded-md border p-2 text-left text-sm hover:border-primary" onClick={() => { setCustomer(c); setCustomerHits([]); }}>
                        {c.name} · {c.phone}{c.vip ? " · VIP" : ""}
                      </button>
                    ))}
                    <FormField control={form.control} name="customerName" label="Or type a name (optional)" description="Name and phone are required for credit sales." idPrefix="pos" />
                    <FormField control={form.control} name="customerPhone" label="Phone (optional)" inputMode="tel" idPrefix="pos" />
                  </>
                )}
              </fieldset>
              <FormField control={form.control} name="note" label="Note" multiline idPrefix="pos" />

              {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
              <Button type="submit" className="h-12 text-base" disabled={form.formState.isSubmitting || lines.length === 0 || trackedIncomplete || !preview?.ok || (settle && !settle.ok)}>
                {form.formState.isSubmitting ? "Saving..." : preview?.ok ? `Complete sale · ${formatPkr(preview.total)}` : "Complete sale"}
              </Button>
              {trackedIncomplete ? <p className="text-xs text-muted-foreground">Choose at least one IMEI for each device in the cart.</p> : null}
              {lines.length > 0 ? <Button type="button" variant="outline" onClick={() => { form.reset(EMPTY); setDevices({}); }}>Clear cart</Button> : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
