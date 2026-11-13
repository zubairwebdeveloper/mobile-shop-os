import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/constants/commerce";
import { MOCK_COUPONS } from "@/data/mock/coupons";

// All money values are whole PKR integers.

export function validateCoupon(rawCode, subtotal) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code" };
  const coupon = MOCK_COUPONS.find((c) => c.code === code);
  if (!coupon) return { ok: false, error: "This coupon code is not valid" };
  if (subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      error: `Add items worth Rs. ${(coupon.minSubtotal - subtotal).toLocaleString("en-PK")} more to use ${coupon.code}`,
    };
  }
  return { ok: true, coupon };
}

export function calcTotals(items, coupon) {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  let discount = 0;
  let freeShipping = false;
  let couponIssue = null;

  if (coupon && subtotal > 0) {
    if (subtotal < coupon.minSubtotal) {
      couponIssue = `${coupon.code} needs a minimum order of Rs. ${coupon.minSubtotal.toLocaleString("en-PK")}`;
    } else if (coupon.type === "percent") {
      discount = Math.min(Math.round((subtotal * coupon.value) / 100), coupon.maxDiscount ?? Infinity);
    } else if (coupon.type === "fixed") {
      discount = Math.min(coupon.value, subtotal);
    } else if (coupon.type === "freeship") {
      freeShipping = true;
    }
  }

  const discounted = subtotal - discount;
  const shipping =
    subtotal === 0 ? 0 : freeShipping || discounted >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  return {
    itemCount,
    subtotal,
    discount,
    shipping,
    total: discounted + shipping,
    couponIssue,
    amountToFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - discounted),
  };
}
