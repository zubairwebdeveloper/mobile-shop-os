import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { forbidden } from "@/lib/security/errors";
import { col, docRef } from "./common";
import { inventoryId } from "./pure";

/**
 * Rebuilds the stock counters of IMEI-tracked variants from the devices themselves (IN_STOCK per branch).
 * Needed once for devices registered before Phase 7, and available as a reconciliation tool afterwards.
 * Requires an all-branches member. Writes a RECOUNT movement for every counter that changed.
 */
export async function recountImeiInventory(ctx) {
  if (!ctx.allBranches) throw forbidden();
  const records = (await col(ctx, "imeiRecords").limit(5000).get()).docs;
  const meta = new Map();
  const counts = new Map();
  const trackedVariants = new Set();
  for (const r of records) {
    const d = r.data();
    trackedVariants.add(d.variantId);
    meta.set(d.variantId, { productId: d.productId, productName: d.productName, variantLabel: d.variantLabel });
    if (d.status === "IN_STOCK") {
      const id = inventoryId(d.variantId, d.branchId);
      counts.set(id, { variantId: d.variantId, branchId: d.branchId, quantity: (counts.get(id)?.quantity ?? 0) + 1 });
    }
  }

  const existing = (await col(ctx, "inventory").limit(5000).get()).docs;
  const targets = new Map(counts);
  for (const e of existing) {
    if (trackedVariants.has(e.data().variantId) && !targets.has(e.id)) {
      targets.set(e.id, { variantId: e.data().variantId, branchId: e.data().branchId, quantity: 0 });
    }
  }
  const before = new Map(existing.map((e) => [e.id, e.data().quantity ?? 0]));

  const db = adminDb();
  let changed = 0;
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) await batch.commit();
    batch = db.batch();
    ops = 0;
  };
  for (const [id, t] of targets) {
    const old = before.get(id) ?? 0;
    if (old === t.quantity) continue;
    const m = meta.get(t.variantId);
    const now = FieldValue.serverTimestamp();
    batch.set(docRef(ctx, "inventory", id), { ...t, ...m, updatedAt: now }, { merge: true });
    batch.set(col(ctx, "stockMovements").doc(), {
      type: "RECOUNT", variantId: t.variantId, branchId: t.branchId, ...m, quantityChange: t.quantity - old, quantityAfter: t.quantity,
      reason: "RECOUNT", note: "", refType: null, refId: null, actorUid: ctx.user.uid, createdAt: now,
    });
    changed += 1;
    ops += 2;
    if (ops >= 400) await flush();
  }
  await flush();
  await col(ctx, "auditLogs").add({ action: "INVENTORY_RECOUNTED", actorUid: ctx.user.uid, targetType: "inventory", targetId: "imei", detail: { changed }, createdAt: FieldValue.serverTimestamp() });
  return { changed };
}
