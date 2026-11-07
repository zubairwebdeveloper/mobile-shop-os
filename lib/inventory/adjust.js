import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { variantLabel } from "@/lib/catalog/pure";
import { conflict, notFound } from "@/lib/security/errors";
import { assertBranch, col, docRef } from "./common";
import { StockBook } from "./stock";

/**
 * Manual stock adjustment for NON-IMEI products (damage, loss, found, count correction).
 * IMEI-tracked devices change stock through their own status/branch, never by a bare number.
 */
export async function adjustStock(ctx, input) {
  assertBranch(ctx, input.branchId);

  await adminDb().runTransaction(async (tx) => {
    const [variant, branch] = await Promise.all([tx.get(docRef(ctx, "productVariants", input.variantId)), tx.get(docRef(ctx, "branches", input.branchId))]);
    if (!variant.exists) throw notFound("Variant not found.");
    if (!branch.exists || branch.data().active === false) throw notFound("Branch not found.");
    const product = await tx.get(docRef(ctx, "products", variant.data().productId));
    if (!product.exists) throw notFound("Product not found.");
    if (product.data().tracksImei === true) {
      throw conflict("USE_IMEI_STATUS", "This product is IMEI-tracked. Change the device's status or branch instead.");
    }

    const book = new StockBook(ctx);
    await book.load(tx, [{ variantId: variant.id, branchId: input.branchId }]);
    book.change({
      variantId: variant.id, branchId: input.branchId, productId: product.id, productName: product.data().name,
      variantLabel: variantLabel(variant.data()), delta: input.delta, type: "ADJUSTMENT", reason: input.reason, note: input.note,
    });
    book.commit(tx);
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "STOCK_ADJUSTED", actorUid: ctx.user.uid, targetType: "variant", targetId: variant.id,
      detail: { branchId: input.branchId, delta: input.delta, reason: input.reason }, createdAt: FieldValue.serverTimestamp(),
    });
  });
}
