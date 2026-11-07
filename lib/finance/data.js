import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { col, assertBranch } from "@/lib/inventory/common";
import { conflict } from "@/lib/security/errors";
import { dayRangeUtc } from "@/lib/sales/pure";
import { getShopSettings } from "@/lib/tenant/settings";

/** Shared readers for finance. Every read is limited to the branches the caller may use. */

export const CAP = 3000;

export async function periodWindow(ctx, { from, to }) {
  const { timezone } = await getShopSettings(ctx);
  return { timezone, start: dayRangeUtc(from, timezone).start, end: dayRangeUtc(to, timezone).end };
}

/** null = no branch filter (all-branch member looking at everything); otherwise the branch ids to query. */
export function branchScopes(ctx, branchId) {
  if (branchId) {
    assertBranch(ctx, branchId);
    return [branchId];
  }
  return ctx.allBranches ? [null] : ctx.branchIds.slice(0, 30);
}

/** Documents whose `field` is in [lo, hi) (or [lo, hi] when inclusive), within the caller's branches. */
export async function windowDocs(ctx, name, field, lo, hi, branchId, { inclusive = false, cap = CAP } = {}) {
  const scopes = branchScopes(ctx, branchId);
  const snaps = await Promise.all(
    scopes.map((b) => {
      const base = b ? col(ctx, name).where("branchId", "==", b) : col(ctx, name);
      return base.where(field, ">=", lo).where(field, inclusive ? "<=" : "<", hi).limit(cap + 1).get();
    }),
  );
  const docs = snaps.flatMap((s) => s.docs);
  if (docs.length > cap) throw conflict("TOO_MANY_RECORDS", "That period has too many records. Choose a shorter period.");
  return docs;
}

/** Documents with a positive balance right now (receivables). */
export async function owingDocs(ctx, name, branchId, cap = 2000) {
  const scopes = branchScopes(ctx, branchId);
  const snaps = await Promise.all(
    scopes.map((b) => (b ? col(ctx, name).where("branchId", "==", b) : col(ctx, name)).where("dueAmount", ">", 0).limit(cap + 1).get()),
  );
  const docs = snaps.flatMap((s) => s.docs);
  if (docs.length > cap) throw conflict("TOO_MANY_RECORDS", "Too many open balances to total here.");
  return docs;
}

export async function getAllById(ctx, name, ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 300) {
    const refs = ids.slice(i, i + 300).map((id) => col(ctx, name).doc(id));
    if (refs.length) out.push(...(await adminDb().getAll(...refs)));
  }
  return out;
}
