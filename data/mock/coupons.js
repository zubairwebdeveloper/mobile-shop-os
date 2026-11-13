// MOCK DATA - demo coupons. Real coupons (Firestore `coupons`) are validated server-side in Phase 04.
export const MOCK_COUPONS = [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    maxDiscount: 15000,
    minSubtotal: 20000,
    description: "10% off (up to Rs. 15,000) on orders above Rs. 20,000",
  },
  {
    code: "SAVE5000",
    type: "fixed",
    value: 5000,
    minSubtotal: 50000,
    description: "Rs. 5,000 off on orders above Rs. 50,000",
  },
  {
    code: "FREESHIP",
    type: "freeship",
    value: 0,
    minSubtotal: 0,
    description: "Free delivery on any order",
  },
];
