"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { Banknote, CreditCard, Info, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { OrderSummary } from "@/components/cart/order-summary";
import { ProductImage } from "@/components/product/product-image";
import { EmptyState } from "@/components/shared/empty-state";
import { calcTotals } from "@/lib/cart/pricing";
import { PROVINCES } from "@/lib/constants/commerce";
import { checkoutSchema } from "@/lib/validations/forms";
import { formatPrice, formatStorage } from "@/lib/utils/format";
import { clearCart } from "@/store/slices/cart-slice";
import { orderPlaced } from "@/store/slices/orders-slice";
import { useHydrated } from "@/hooks/use-hydrated";

function makeReference() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ZM-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function TextField({ control, name, label, description, ...inputProps }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`co-${name}`}>{label}</FieldLabel>
          <Input {...field} id={`co-${name}`} aria-invalid={fieldState.invalid} {...inputProps} />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function CheckoutClient() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { items, coupon, hydrated: storeReady } = useSelector((state) => state.cart);
  const hydrated = useHydrated() && storeReady;
  const [placed, setPlaced] = useState(false);
  const totals = useMemo(() => calcTotals(items, coupon), [items, coupon]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      notes: "",
      paymentMethod: "cod",
      acceptTerms: false,
    },
  });

  async function onSubmit(values) {
    try {
      await new Promise((r) => setTimeout(r, 600));
      const reference = makeReference();
      const order = {
        id: reference,
        reference,
        createdAt: new Date().toISOString(),
        status: "Pending (saved on this device only)",
        paymentMethod: "Cash on Delivery",
        paymentStatus: "Unpaid - pay on delivery",
        customer: { name: values.name, email: values.email, phone: values.phone },
        address: {
          line: values.address,
          city: values.city,
          province: values.province,
          postalCode: values.postalCode || "",
        },
        notes: values.notes || "",
        couponCode: totals.discount > 0 || coupon?.type === "freeship" ? coupon?.code ?? null : null,
        items,
        totals,
      };
      setPlaced(true);
      dispatch(orderPlaced(order));
      dispatch(clearCart());
      toast.success("Order saved. Review your confirmation.");
      router.push("/checkout/confirmation");
    } catch {
      setPlaced(false);
      toast.error("We could not place your order. Please try again.");
    }
  }

  if (!hydrated || placed) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]" role="status" aria-label="Loading checkout">
        <div className="space-y-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Nothing to check out"
        description="Your cart is empty. Add a product first, then come back here."
        href="/shop"
        actionLabel="Browse products"
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <div role="note" className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">Demo checkout.</span> Your order is saved on this device only
            until the store backend is connected. No payment is taken.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
            <CardDescription>We use these to confirm and deliver your order.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField control={control} name="name" label="Full name" autoComplete="name" disabled={isSubmitting} />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField control={control} name="email" label="Email" type="email" autoComplete="email" disabled={isSubmitting} />
                <TextField
                  control={control}
                  name="phone"
                  label="Mobile number"
                  type="tel"
                  autoComplete="tel"
                  placeholder="0300 1234567"
                  disabled={isSubmitting}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery address</CardTitle>
            <CardDescription>Where should we send your order?</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <TextField
                control={control}
                name="address"
                label="Street address"
                autoComplete="street-address"
                description="House / flat number, street and area."
                disabled={isSubmitting}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField control={control} name="city" label="City" autoComplete="address-level2" disabled={isSubmitting} />
                <Controller
                  name="province"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="co-province">Province</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                        <SelectTrigger id="co-province" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVINCES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              <TextField
                control={control}
                name="postalCode"
                label="Postal code (optional)"
                inputMode="numeric"
                autoComplete="postal-code"
                disabled={isSubmitting}
              />
              <Controller
                name="notes"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="co-notes">Order notes (optional)</FieldLabel>
                    <Textarea {...field} id="co-notes" rows={3} aria-invalid={fieldState.invalid} disabled={isSubmitting} />
                    <FieldDescription>Delivery instructions or a preferred time.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
            <CardDescription>Online payments are not available yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <RadioGroup value={field.value} onValueChange={field.onChange} aria-label="Payment method">
                    <label
                      htmlFor="pay-cod"
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary bg-primary/5 p-4"
                    >
                      <RadioGroupItem id="pay-cod" value="cod" className="mt-0.5" />
                      <span className="flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          <Banknote className="size-4 text-primary" /> Cash on Delivery
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">Pay in cash when your order arrives.</span>
                      </span>
                    </label>
                    <label
                      htmlFor="pay-online"
                      className="flex items-start gap-3 rounded-xl border p-4 opacity-60"
                    >
                      <RadioGroupItem id="pay-online" value="online" disabled className="mt-0.5" />
                      <span className="flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          <CreditCard className="size-4" /> Card / Easypaisa / JazzCash
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">Coming soon.</span>
                      </span>
                    </label>
                  </RadioGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <OrderSummary
          totals={totals}
          coupon={coupon}
          footer={
            <>
              <Controller
                name="acceptTerms"
                control={control}
                render={({ field, fieldState }) => (
                  <Field orientation="horizontal" data-invalid={fieldState.invalid} className="items-start">
                    <Checkbox
                      id="co-terms"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      aria-invalid={fieldState.invalid}
                      disabled={isSubmitting}
                    />
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="co-terms" className="items-start text-xs leading-snug font-normal">
                        I confirm my details are correct and agree to the delivery and return policy.
                      </FieldLabel>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </div>
                  </Field>
                )}
              />
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? "Placing order..." : `Place order - ${formatPrice(totals.total)}`}
              </Button>
              <Link href="/cart" className="text-center text-sm font-semibold text-primary hover:underline">
                Back to cart
              </Link>
            </>
          }
        >
          <ul className="max-h-56 space-y-3 overflow-y-auto border-t pt-4" aria-label="Items in your order">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3">
                <ProductImage shape={i.shape} color={i.colorHex} label={i.name} className="size-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="truncate font-semibold">{i.name}</p>
                  <p className="text-muted-foreground">
                    {[i.colorName, i.storage ? formatStorage(i.storage) : null].filter(Boolean).join(" / ")} &times; {i.qty}
                  </p>
                </div>
                <span className="text-xs font-semibold">{formatPrice(i.unitPrice * i.qty)}</span>
              </li>
            ))}
          </ul>
        </OrderSummary>
      </div>
    </form>
  );
}
