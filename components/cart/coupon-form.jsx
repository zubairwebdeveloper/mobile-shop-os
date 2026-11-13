"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { Loader2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { applyCoupon, removeCoupon } from "@/store/slices/cart-slice";
import { validateCoupon } from "@/lib/cart/pricing";
import { couponSchema } from "@/lib/validations/forms";

export function CouponForm({ subtotal, issue }) {
  const dispatch = useDispatch();
  const coupon = useSelector((state) => state.cart.coupon);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(couponSchema), defaultValues: { code: "" } });

  async function onSubmit({ code }) {
    const result = validateCoupon(code, subtotal);
    if (!result.ok) {
      setError("code", { message: result.error });
      return;
    }
    dispatch(applyCoupon(result.coupon));
    toast.success(`${result.coupon.code} applied`);
    reset();
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="size-4 text-primary" /> Coupon code
        </CardTitle>
        <CardDescription>Try WELCOME10, SAVE5000 or FREESHIP (demo coupons).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {coupon ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3">
            <div className="min-w-0">
              <Badge variant="mint">{coupon.code}</Badge>
              <p className="mt-1 text-xs text-muted-foreground">{coupon.description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove coupon ${coupon.code}`}
              onClick={() => dispatch(removeCoupon())}
            >
              <X />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Controller
              name="code"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="coupon-code" className="sr-only">
                    Coupon code
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      {...field}
                      id="coupon-code"
                      placeholder="Enter code"
                      autoComplete="off"
                      className="uppercase"
                      aria-invalid={fieldState.invalid}
                      disabled={isSubmitting}
                    />
                    <Button type="submit" variant="secondary" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="animate-spin" />} Apply
                    </Button>
                  </div>
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription>Codes are checked again when your order is confirmed.</FieldDescription>
                  )}
                </Field>
              )}
            />
          </form>
        )}
        {issue && <p role="alert" className="text-sm text-destructive">{issue}</p>}
      </CardContent>
    </Card>
  );
}
