/**
 * Deterministic date formatting (always UTC) so server-rendered and client-rendered output match
 * and no hydration warning appears. Pass an ISO string; returns "2026-11-01 14:05 UTC".
 */
export function formatUtc(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function formatUtcDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}
