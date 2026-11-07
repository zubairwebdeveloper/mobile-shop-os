import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { conflict } from "@/lib/security/errors";
import { applyDelta, inventoryId } from "./pure";

/**
 * Stock ledger for ONE Firestore transaction.
 *   1. `await StockLedger.load(tx, ctx, pairs)`  (all reads happen here, before any write)
 *   2. `ledger.change(...)` any number of times (in memory; refuses to go below zero)
 *   3. `ledger.commit(tx)` writes the inventory documents and one stockMovements entry per change
 * Every stock change in the app goes through this, so quantity and history can never disagree.
 */
export class StockLedger {
  constructor(ctx, entries) {
    this.ctx = ctx;
    this.entries = entries; // key -> { ref, quantity, names }
    this.movements = [];
  }

  static async load(tx, ctx, pairs) {
    const db = adminDb();
    const byKey = new Map(pairs.map((p) => [inventoryId(p.variantId, p.branchId), p]));
    const keys = [...byKey.keys()];
    const snaps = await Promise.all(keys.map((k) => tx.get(db.doc(`tenants/${ctx.tenantId}/inventory/${k}`))));
    const entries = new Map(
      keys.map((k, i) => [
        k,
        {
          ref: snaps[i].ref,
          variantId: byKey.get(k).variantId,
          branchId: byKey.get(k).branchId,
          quantity: snaps[i].exists ? snaps[i].data().quantity ?? 0 : 0,
          names: {},
        },
      ])
    );
    return new StockLedger(ctx, entries);
  }

  quantity(variantId, branchId) {
    return this.entries.get(inventoryId(variantId, branchId))?.quantity ?? 0;
  }

  change({ variantId, branchId, delta, type, reason = "", refType = null, refId = null, productId, productName = "", variantLabel = "" }) {
    const entry = this.entries.get(inventoryId(variantId, branchId));
    if (!entry) throw new Error("StockLedger.change: pair was not loaded");
    let next;
    try {
      next = applyDelta(entry.quantity, delta);
    } catch {
      throw conflict("INSUFFICIENT_STOCK", `Not enough stock${productName ? ` of ${productName}` : ""} at that branch.`);
    }
    entry.quantity = next;
    entry.names = { productId, productName, variantLabel };
    this.movements.push({ variantId, branchId, productId: productId ?? null, productName, variantLabel, type, change: delta, after: next, reason, refType, refId });
  }

  commit(tx) {
    const db = adminDb();
    const now = FieldValue.serverTimestamp();
    for (const [key, entry] of this.entries) {
      if (!this.movements.some((m) => inventoryId(m.variantId, m.branchId) === key)) continue;
      tx.set(
        entry.ref,
        { variantId: entry.variantId, branchId: entry.branchId, quantity: entry.quantity, ...entry.names, updatedAt: now },
        { merge: true }
      );
    }
    for (const movement of this.movements) {
      tx.set(db.collection(`tenants/${this.ctx.tenantId}/stockMovements`).doc(), {
        ...movement,
        actorUid: this.ctx.user.uid,
        createdAt: now,
      });
    }
  }
}
