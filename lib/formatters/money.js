/** Integer paisa -> "PKR 12,500". Manual grouping keeps server and client output identical. */
export function formatPkr(paisa) {
  if (paisa == null || !Number.isFinite(paisa)) return "—";
  const rupees = Math.round(paisa / 100);
  return `PKR ${String(rupees).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
