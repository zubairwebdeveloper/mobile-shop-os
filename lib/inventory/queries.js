import "server-only";
import { isSafeId } from "@/lib/security/ids";
import { variantLabel } from "@/lib/catalog/pure";
import { col, docRef, iso, queryInChunks } from "./common";
import { lowStockRows } from "./pure";

/** Read models. Every result is limited to the branches the caller may access. */

const serializeStock = (d) => ({
  id: d.id,
  variantId: d.data().variantId,
  productId: d.data().productId,
  branchId: d.data().branchId,
  productName: d.data().productName ?? "",
  variantLabel: d.data().variantLabel ?? "",
  quantity: d.data().quantity ?? 0,
});

async function scopedDocs(ctx, name, limit) {
  const base = col(ctx, name);
  if (ctx.allBranches) return (await base.limit(limit).get()).docs;
  if (ctx.branchIds.length === 0) return [];
  return queryInChunks(base, "branchId", ctx.branchIds);
}

export async function listInventory(ctx, limit = 2000) {
  const docs = await scopedDocs(ctx, "inventory", limit);
  return docs
    .map(serializeStock)
    .sort((a, b) => a.productName.localeCompare(b.productName) || a.variantLabel.localeCompare(b.variantLabel));
}

const serializeMovement = (d) => ({
  id: d.id,
  type: d.data().type,
  productName: d.data().productName ?? "",
  variantLabel: d.data().variantLabel ?? "",
  branchId: d.data().branchId,
  quantityChange: d.data().quantityChange,
  quantityAfter: d.data().quantityAfter,
  reason: d.data().reason ?? null,
  note: d.data().note ?? "",
  refType: d.data().refType ?? null,
  refId: d.data().refId ?? null,
  actorUid: d.data().actorUid ?? null,
  createdAt: iso(d.data().createdAt),
});

/** Newest-first movements. Members limited to branches use an `in` filter (max 30 branches, needs the composite index). */
export async function listMovements(ctx, { limit = 50, cursor } = {}) {
  const base = col(ctx, "stockMovements");
  let query;
  if (ctx.allBranches) {
    query = base.orderBy("createdAt", "desc");
  } else {
    if (ctx.branchIds.length === 0) return { entries: [], nextCursor: null };
    query = base.where("branchId", "in", ctx.branchIds.slice(0, 30)).orderBy("createdAt", "desc");
  }
  if (isSafeId(cursor)) {
    const snap = await docRef(ctx, "stockMovements", cursor).get();
    if (snap.exists) query = query.startAfter(snap);
  }
  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  return { entries: docs.map(serializeMovement), nextCursor: snap.docs.length > limit ? docs[docs.length - 1].id : null };
}

/** Variants at or below their minimum stock, counted over the branches the caller may see. */
export async function getLowStock(ctx) {
  const [variantSnap, productSnap, stock] = await Promise.all([
    col(ctx, "productVariants").where("status", "==", "ACTIVE").limit(1000).get(),
    col(ctx, "products").where("status", "==", "ACTIVE").limit(1000).get(),
    listInventory(ctx),
  ]);
  const names = new Map(productSnap.docs.map((p) => [p.id, p.data().name]));
  const variants = variantSnap.docs
    .filter((v) => names.has(v.data().productId))
    .map((v) => ({
      id: v.id,
      productId: v.data().productId,
      productName: names.get(v.data().productId),
      variantLabel: variantLabel(v.data()),
      minStock: v.data().minStock ?? 0,
      status: "ACTIVE",
    }));
  const totals = {};
  for (const s of stock) totals[s.variantId] = (totals[s.variantId] ?? 0) + s.quantity;
  return lowStockRows(variants, totals);
}

/** Active variants of active products, for pickers (purchase orders, adjustments, transfers). */
export async function listVariantOptions(ctx) {
  const [variantSnap, productSnap] = await Promise.all([
    col(ctx, "productVariants").where("status", "==", "ACTIVE").limit(1000).get(),
    col(ctx, "products").where("status", "==", "ACTIVE").limit(1000).get(),
  ]);
  const products = new Map(productSnap.docs.map((p) => [p.id, p.data()]));
  return variantSnap.docs
    .filter((v) => products.has(v.data().productId))
    .map((v) => ({
      id: v.id,
      productId: v.data().productId,
      productName: products.get(v.data().productId).name,
      variantLabel: variantLabel(v.data()),
      tracksImei: products.get(v.data().productId).tracksImei === true,
      purchasePrice: v.data().purchasePrice ?? null,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName) || a.variantLabel.localeCompare(b.variantLabel));
}
