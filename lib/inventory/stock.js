import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { conflict } from "@/lib/security/errors";
import { applyDelta, inventoryId } from "./pure";

/**
 * StockBook: transactional stock changes for one request.
 *
 * Firestore transactions need every read BEFORE the first write, so usage is:
 *   const book = new StockBook(ctx);
 *   await book.load(tx, [{ variantId, branchId }, ...]);   // reads
 *   book.change({ ... });                                  // in memory (throws INSUFFICIENT_STOCK)
 *   book.commit(tx);                                       // writes inventory docs + movements
 *
 * Several changes to the same variant+branch compose correctly. Movements are append-only history
 * (tenants/{id}/stockMovements), server-written only.
 */
export class StockBook {
  constructor(ctx) {
    this.ctx = ctx;
    this.quantities = new Map();
    this.meta = new Map();
    this.movements = [];
  }

  ref(id) {
    return adminDb().doc(`tenants/${this.ctx.tenantId}/inventory/${id}`);
  }

  async load(tx, pairs) {
    const ids = [...new Set(pairs.map((p) => inventoryId(p.variantId, p.branchId)))];
    const snaps = await Promise.all(ids.map((id) => tx.get(this.ref(id))));
    ids.forEach((id, i) => this.quantities.set(id, snaps[i].exists ? snaps[i].data().quantity ?? 0 : 0));
  }

  change({ variantId, branchId, productId, productName, variantLabel, delta, type, refType = null, refId = null, reason = null, note = "" }) {
    const id = inventoryId(variantId, branchId);
    if (!this.quantities.has(id)) throw new Error("StockBook: load() the stock line before change()");
    const next = applyDelta(this.quantities.get(id), delta);
    if (next === null) {
      throw conflict("INSUFFICIENT_STOCK", `${productName} (${variantLabel}): not enough stock for this change.`);
    }
    this.quantities.set(id, next);
    this.meta.set(id, { variantId, branchId, productId, productName, variantLabel });
    this.movements.push({
      type, variantId, branchId, productId, productName, variantLabel,
      quantityChange: delta, quantityAfter: next, refType, refId, reason, note,
    });
  }

  commit(tx) {
    const now = FieldValue.serverTimestamp();
    for (const [id, meta] of this.meta) {
      tx.set(this.ref(id), { ...meta, quantity: this.quantities.get(id), updatedAt: now }, { merge: true });
    }
    const movements = adminDb().collection(`tenants/${this.ctx.tenantId}/stockMovements`);
    for (const m of this.movements) {
      tx.set(movements.doc(), { ...m, actorUid: this.ctx.user.uid, createdAt: now });
    }
  }
}
