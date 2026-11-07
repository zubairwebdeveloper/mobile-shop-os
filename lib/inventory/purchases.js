import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { stageNewImei } from "@/lib/catalog/imei";
import { rupeesToPaisa, variantLabel } from "@/lib/catalog/pure";
import { conflict, notFound, badRequest } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { assertBranch, col, docRef, iso, mayUseBranch, queryInChunks } from "./common";
import { poNumber, statusAfterReceipt, totalCost, validateReceiveLines } from "./pure";
import { StockBook } from "./stock";

/**
 * Purchase orders and receiving. Items are embedded in the purchase document (max 50 lines) so that
 * receiving updates received quantities, stock, devices and status in ONE transaction. (The brief lists a
 * separate purchaseItems collection; embedding was chosen for atomicity, see docs/INVENTORY_AND_PURCHASES.md.)
 *
 * Receiving is idempotent: the client sends a receiptKey; a repeated key changes nothing.
 * Over-receipt is refused. IMEI-tracked units need one IMEI entry each and become IN_STOCK devices.
 */

const serializeItem = (i) => ({
  variantId: i.variantId, productId: i.productId, productName: i.productName, variantLabel: i.variantLabel,
  quantity: i.quantity, unitCost: i.unitCost, receivedQty: i.receivedQty ?? 0,
});

const serialize = (d) => {
  const p = d.data();
  return {
    id: d.id, number: p.number, supplierId: p.supplierId, supplierName: p.supplierName ?? "",
    branchId: p.branchId, branchName: p.branchName ?? "", status: p.status, note: p.note ?? "",
    totalCost: p.totalCost ?? 0, items: (p.items ?? []).map(serializeItem), createdAt: iso(p.createdAt),
  };
};

export async function listPurchases(ctx, limit = 200) {
  const base = col(ctx, "purchases");
  let docs;
  if (ctx.allBranches) docs = (await base.orderBy("createdAt", "desc").limit(limit).get()).docs;
  else if (ctx.branchIds.length === 0) docs = [];
  else docs = await queryInChunks(base, "branchId", ctx.branchIds);
  return docs.map(serialize).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, limit);
}

export async function getPurchase(ctx, id) {
  if (!isSafeId(id)) return null;
  const snap = await docRef(ctx, "purchases", id).get();
  // A purchase in a branch the member cannot access looks exactly like a missing one.
  if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) return null;
  return serialize(snap);
}

export async function createPurchase(ctx, input) {
  assertBranch(ctx, input.branchId);
  const ref = col(ctx, "purchases").doc();
  const counterRef = docRef(ctx, "counters", "purchases");

  await adminDb().runTransaction(async (tx) => {
    const variantIds = [...new Set(input.items.map((i) => i.variantId))];
    if (variantIds.length !== input.items.length) throw badRequest("A product appears twice.");

    const [supplier, branch, counter, ...variants] = await Promise.all([
      tx.get(docRef(ctx, "suppliers", input.supplierId)),
      tx.get(docRef(ctx, "branches", input.branchId)),
      tx.get(counterRef),
      ...variantIds.map((id) => tx.get(docRef(ctx, "productVariants", id))),
    ]);
    if (!supplier.exists || supplier.data().active === false) throw conflict("SUPPLIER_UNAVAILABLE", "Choose an active supplier.");
    if (!branch.exists || branch.data().active === false) throw notFound("Branch not found.");
    const products = await Promise.all(variants.map((v) => (v.exists ? tx.get(docRef(ctx, "products", v.data().productId)) : null)));

    const items = input.items.map((line) => {
      const i = variantIds.indexOf(line.variantId);
      const v = variants[i];
      const p = products[i];
      if (!v.exists || v.data().status !== "ACTIVE" || !p?.exists || p.data().status !== "ACTIVE") {
        throw conflict("ITEM_UNAVAILABLE", "One of the products is missing or archived.");
      }
      return {
        variantId: v.id, productId: p.id, productName: p.data().name, variantLabel: variantLabel(v.data()),
        quantity: line.quantity, unitCost: rupeesToPaisa(line.unitCost), receivedQty: 0,
      };
    });

    const seq = (counter.exists ? counter.data().next : 1) ?? 1;
    const now = FieldValue.serverTimestamp();
    tx.set(counterRef, { next: seq + 1 });
    tx.set(ref, {
      number: poNumber(seq), supplierId: supplier.id, supplierName: supplier.data().name, branchId: input.branchId,
      branchName: branch.data().name ?? "", status: "DRAFT", note: input.note, items, totalCost: totalCost(items),
      createdAt: now, createdBy: ctx.user.uid,
    });
    tx.set(col(ctx, "auditLogs").doc(), { action: "PURCHASE_CREATED", actorUid: ctx.user.uid, targetType: "purchase", targetId: ref.id, createdAt: now });
  });
  return { id: ref.id };
}

/** DRAFT -> ORDERED, or cancel while nothing has been received. */
export async function changePurchaseStatus(ctx, id, action) {
  if (!isSafeId(id)) throw notFound("Purchase not found.");
  const ref = docRef(ctx, "purchases", id);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) throw notFound("Purchase not found.");
    const p = snap.data();
    const received = (p.items ?? []).some((i) => (i.receivedQty ?? 0) > 0);
    let next;
    if (action === "ORDER" && p.status === "DRAFT") next = "ORDERED";
    else if (action === "CANCEL" && (p.status === "DRAFT" || p.status === "ORDERED") && !received) next = "CANCELLED";
    else throw conflict("INVALID_STATE", "This purchase cannot be changed that way.");
    const now = FieldValue.serverTimestamp();
    tx.update(ref, { status: next, updatedAt: now });
    tx.set(col(ctx, "auditLogs").doc(), { action: next === "ORDERED" ? "PURCHASE_ORDERED" : "PURCHASE_CANCELLED", actorUid: ctx.user.uid, targetType: "purchase", targetId: id, createdAt: now });
  });
}

export async function receivePurchase(ctx, id, { receiptKey, lines }) {
  if (!isSafeId(id)) throw notFound("Purchase not found.");
  const purchaseRef = docRef(ctx, "purchases", id);
  const receiptRef = purchaseRef.collection("receipts").doc(receiptKey);
  let duplicate = false;

  await adminDb().runTransaction(async (tx) => {
    duplicate = false;
    const [snap, receipt] = await Promise.all([tx.get(purchaseRef), tx.get(receiptRef)]);
    if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) throw notFound("Purchase not found.");
    if (receipt.exists) {
      duplicate = true; // same receiptKey already applied: change nothing
      return;
    }
    const purchase = snap.data();
    if (purchase.status !== "ORDERED" && purchase.status !== "PARTIALLY_RECEIVED") {
      throw conflict("INVALID_STATE", "Only an ordered purchase can be received.");
    }
    const items = purchase.items ?? [];

    // Live IMEI-tracking flag (a category may have changed since the order was written).
    const productIds = [...new Set(lines.map((l) => items.find((i) => i.variantId === l.variantId)?.productId).filter(Boolean))];
    const [branch, ...products] = await Promise.all([
      tx.get(docRef(ctx, "branches", purchase.branchId)),
      ...productIds.map((pid) => tx.get(docRef(ctx, "products", pid))),
    ]);
    const tracked = {};
    for (const item of items) {
      const p = products.find((x) => x.id === item.productId);
      if (p) tracked[item.variantId] = p.data().tracksImei === true;
      if (p && p.data().status !== "ACTIVE") throw conflict("ITEM_UNAVAILABLE", `${item.productName} is archived.`);
    }

    const verdict = validateReceiveLines(items, lines, tracked);
    if (!verdict.ok) throw conflict(verdict.code, verdict.message);

    const imeiList = lines.flatMap((l) => (l.imeis ?? []).flatMap((e) => [e.imei1, e.imei2].filter(Boolean)));
    const claims = await Promise.all(imeiList.map((n) => tx.get(docRef(ctx, "imeiClaims", n))));
    if (claims.some((c) => c.exists)) throw conflict("IMEI_EXISTS", "One of these IMEIs is already registered in your shop.");

    const book = new StockBook(ctx);
    await book.load(tx, lines.map((l) => ({ variantId: l.variantId, branchId: purchase.branchId })));

    const now = FieldValue.serverTimestamp();
    const updated = items.map((item) => {
      const line = lines.find((l) => l.variantId === item.variantId);
      if (!line) return item;
      book.change({
        variantId: item.variantId, branchId: purchase.branchId, productId: item.productId, productName: item.productName,
        variantLabel: item.variantLabel, delta: line.quantity, type: "RECEIVE", refType: "purchase", refId: id, note: purchase.number,
      });
      for (const entry of line.imeis ?? []) {
        stageNewImei(tx, ctx, col(ctx, "imeiRecords").doc(), {
          ...entry, productId: item.productId, variantId: item.variantId, productName: item.productName,
          variantLabel: item.variantLabel, branchId: purchase.branchId, branchName: branch.data()?.name ?? "",
          condition: "NEW", purchasePrice: item.unitCost, supplierId: purchase.supplierId, purchaseId: id,
        });
      }
      return { ...item, receivedQty: (item.receivedQty ?? 0) + line.quantity };
    });
    book.commit(tx);

    const status = statusAfterReceipt(updated);
    tx.update(purchaseRef, { items: updated, status, updatedAt: now });
    tx.set(receiptRef, { lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), actorUid: ctx.user.uid, createdAt: now });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "PURCHASE_RECEIVED", actorUid: ctx.user.uid, targetType: "purchase", targetId: id,
      detail: { status, units: lines.reduce((n, l) => n + l.quantity, 0) }, createdAt: now,
    });
  });
  return { duplicate };
}
