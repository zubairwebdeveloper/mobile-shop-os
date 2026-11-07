import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { can, PERMISSIONS } from "@/lib/permissions/matrix";
import { badRequest } from "@/lib/security/errors";
import { getImeiRecord } from "./imei";
import { classifyCode } from "./pure";
import { getProduct } from "./catalog";

/**
 * Barcode / SKU / IMEI lookup inside the caller's shop. Returns null when nothing matches
 * (also when an IMEI exists only in a branch the caller cannot access).
 */
export async function lookupCode(ctx, rawCode) {
  const { kind, code } = classifyCode(rawCode);
  if (kind === "INVALID") throw badRequest("Not a valid IMEI, barcode or SKU.");

  const base = `tenants/${ctx.tenantId}`;
  const db = adminDb();

  if (kind === "IMEI") {
    if (!can(ctx.role, PERMISSIONS.INVENTORY_READ)) return null;
    const claim = await db.doc(`${base}/imeiClaims/${code}`).get();
    if (!claim.exists) return null;
    const record = await getImeiRecord(ctx, claim.data().recordId);
    return record ? { kind: "IMEI", record } : null;
  }

  const claim = await db.doc(`${base}/barcodes/${code}`).get();
  if (!claim.exists) return null;
  const { productId, variantId } = claim.data();
  const product = await getProduct(ctx, productId);
  if (!product) return null;
  if (variantId) {
    const variant = product.variants.find((v) => v.id === variantId);
    return variant ? { kind: "VARIANT", product: { ...product, variants: undefined }, variant } : null;
  }
  return { kind: "PRODUCT", product };
}
