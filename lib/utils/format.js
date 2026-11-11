// Consistent PKR handling: prices are stored as whole rupees (integers).
const pkr = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

export function formatPrice(amount) {
  return `Rs. ${pkr.format(Math.round(amount || 0))}`;
}

export function discountPercent(price, compareAtPrice) {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function formatStorage(gb) {
  return gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
