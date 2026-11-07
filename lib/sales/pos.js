import "server-only";
import { variantLabel } from "@/lib/catalog/pure";
import { assertBranch, col } from "@/lib/inventory/common";
import { notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";

/** Read models for the POS screen. Everything is limited to ONE branch the caller may work in. */

export async function getPosCatalog(ctx, branchId) {
  if (!isSafeId(branchId)) throw notFound("Branch not found.");
  assertBranch(ctx, branchId);
  const [variantSnap, productSnap, categorySnap, stockSnap] = await Promise.all([
    col(ctx, "productVariants").where("status", "==", "ACTIVE").limit(1000).get(),
    col(ctx, "products").where("status", "==", "ACTIVE").limit(1000).get(),
    col(ctx, "categories").limit(200).get(),
    col(ctx, "inventory").where("branchId", "==", branchId).limit(2000).get(),
  ]);
  const products = new Map(productSnap.docs.map((p) => [p.id, p.data()]));
  const categories = new Map(categorySnap.docs.map((c) => [c.id, c.data().name]));
  const stock = new Map(stockSnap.docs.map((s) => [s.data().variantId, s.data().quantity ?? 0]));
  const items = variantSnap.docs
    .filter((v) => products.has(v.data().productId) && Number.isInteger(v.data().sellingPrice) && v.data().sellingPrice > 0)
    .map((v) => {
      const p = products.get(v.data().productId);
      return {
        variantId: v.id, productId: v.data().productId, productName: p.name, brandName: p.brandName ?? "",
        categoryId: p.categoryId ?? "", categoryName: categories.get(p.categoryId) ?? "", variantLabel: variantLabel(v.data()),
        tracksImei: p.tracksImei === true, sellingPrice: v.data().sellingPrice, barcode: v.data().barcode ?? p.barcode ?? "",
        sku: v.data().sku ?? "", stock: stock.get(v.id) ?? 0,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName) || a.variantLabel.localeCompare(b.variantLabel));
  return { items, categories: [...new Set(items.map((i) => i.categoryName).filter(Boolean))].sort() };
}

/** In-stock devices of one variant at one branch, for the IMEI picker. */
export async function listAvailableImeis(ctx, branchId, variantId) {
  if (!isSafeId(branchId) || !isSafeId(variantId)) throw notFound("Not found.");
  assertBranch(ctx, branchId);
  const snap = await col(ctx, "imeiRecords").where("branchId", "==", branchId).where("variantId", "==", variantId).where("status", "==", "IN_STOCK").limit(200).get();
  return snap.docs.map((d) => ({ id: d.id, imei1: d.data().imei1, imei2: d.data().imei2 ?? "", condition: d.data().condition ?? "NEW" }));
}
