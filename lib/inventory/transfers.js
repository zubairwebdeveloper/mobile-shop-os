import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { variantLabel } from "@/lib/catalog/pure";
import { conflict, forbidden, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { assertBranch, col, docRef, iso, mayUseBranch } from "./common";
import { MAX_IMEI_UNITS_PER_ACTION, validateTransfer } from "./pure";
import { StockBook } from "./stock";

/**
 * Branch transfers. Creating one removes the stock from the source branch immediately (status IN_TRANSIT);
 * IMEI devices become IN_TRANSIT and keep their branch. Receiving adds the stock to the destination (devices
 * move and return to IN_STOCK). Cancelling returns everything to the source. Each step is one transaction.
 * Create/cancel need access to the SOURCE branch; receive needs access to the DESTINATION branch.
 */

const serialize = (d) => {
  const t = d.data();
  return {
    id: d.id, fromBranchId: t.fromBranchId, fromBranchName: t.fromBranchName ?? "", toBranchId: t.toBranchId,
    toBranchName: t.toBranchName ?? "", status: t.status, note: t.note ?? "", createdAt: iso(t.createdAt),
    items: (t.items ?? []).map((i) => ({ variantId: i.variantId, productName: i.productName, variantLabel: i.variantLabel, quantity: i.quantity, imeiCount: (i.imeiRecordIds ?? []).length })),
  };
};

export async function listTransfers(ctx, limit = 100) {
  const snap = await col(ctx, "transfers").orderBy("createdAt", "desc").limit(300).get();
  return snap.docs
    .filter((d) => mayUseBranch(ctx, d.data().fromBranchId) || mayUseBranch(ctx, d.data().toBranchId))
    .slice(0, limit)
    .map(serialize);
}


export async function createTransfer(ctx, input) {
  const verdict = validateTransfer({ fromBranchId: input.fromBranchId, toBranchId: input.toBranchId, items: input.items });
  if (!verdict.ok) throw conflict(verdict.code, verdict.message);
  assertBranch(ctx, input.fromBranchId);
  const ref = col(ctx, "transfers").doc();

  await adminDb().runTransaction(async (tx) => {
    const variantIds = input.items.map((i) => i.variantId);
    const [from, to, ...variants] = await Promise.all([
      tx.get(docRef(ctx, "branches", input.fromBranchId)),
      tx.get(docRef(ctx, "branches", input.toBranchId)),
      ...variantIds.map((id) => tx.get(docRef(ctx, "productVariants", id))),
    ]);
    if (!from.exists || from.data().active === false || !to.exists || to.data().active === false) throw notFound("Branch not found.");
    if (variants.some((v) => !v.exists)) throw notFound("Variant not found.");
    const products = await Promise.all(variants.map((v) => tx.get(docRef(ctx, "products", v.data().productId))));

    // IMEI lines: resolve every IMEI to a device that is IN_STOCK in the source branch.
    const imeiNumbers = input.items.flatMap((i) => i.imeis);
    if (imeiNumbers.length > MAX_IMEI_UNITS_PER_ACTION) throw conflict("TOO_MANY_UNITS", `Transfer at most ${MAX_IMEI_UNITS_PER_ACTION} IMEI-tracked units at a time.`);
    if (new Set(imeiNumbers).size !== imeiNumbers.length) throw conflict("DUPLICATE_IMEI", "An IMEI appears twice.");
    const claims = await Promise.all(imeiNumbers.map((n) => tx.get(docRef(ctx, "imeiClaims", n))));
    if (claims.some((c) => !c.exists)) throw conflict("IMEI_NOT_FOUND", "An IMEI is not registered in your shop.");
    const records = await Promise.all(claims.map((c) => tx.get(docRef(ctx, "imeiRecords", c.data().recordId))));
    const recordByImei = new Map(imeiNumbers.map((n, i) => [n, records[i]]));

    const book = new StockBook(ctx);
    await book.load(tx, input.items.map((i) => ({ variantId: i.variantId, branchId: input.fromBranchId })));

    const now = FieldValue.serverTimestamp();
    const items = input.items.map((line, idx) => {
      const v = variants[idx];
      const p = products[idx];
      const tracked = p.exists && p.data().tracksImei === true;
      const label = variantLabel(v.data());
      let imeiRecordIds = [];
      if (tracked) {
        if (line.imeis.length !== line.quantity) throw conflict("IMEI_COUNT", `${p.data().name}: enter exactly ${line.quantity} IMEI(s).`);
        imeiRecordIds = line.imeis.map((n) => {
          const rec = recordByImei.get(n);
          const r = rec.exists ? rec.data() : null;
          if (!r || r.variantId !== v.id || r.branchId !== input.fromBranchId || r.status !== "IN_STOCK") {
            throw conflict("IMEI_NOT_AVAILABLE", `IMEI ${n} is not in stock at the source branch.`);
          }
          tx.update(rec.ref, { status: "IN_TRANSIT", updatedAt: now });
          tx.set(rec.ref.collection("events").doc(), { type: "TRANSFER_OUT", detail: { transferId: ref.id, toBranchId: input.toBranchId }, actorUid: ctx.user.uid, createdAt: now });
          return rec.id;
        });
      } else if (line.imeis.length > 0) {
        throw conflict("IMEI_NOT_TRACKED", `${p.data().name} does not track IMEI.`);
      }
      book.change({
        variantId: v.id, branchId: input.fromBranchId, productId: p.id, productName: p.data().name, variantLabel: label,
        delta: -line.quantity, type: "TRANSFER_OUT", refType: "transfer", refId: ref.id,
      });
      return { variantId: v.id, productId: p.id, productName: p.data().name, variantLabel: label, quantity: line.quantity, imeiRecordIds };
    });
    book.commit(tx);

    tx.set(ref, {
      fromBranchId: input.fromBranchId, fromBranchName: from.data().name ?? "", toBranchId: input.toBranchId,
      toBranchName: to.data().name ?? "", status: "IN_TRANSIT", note: input.note, items, createdAt: now, createdBy: ctx.user.uid,
    });
    tx.set(col(ctx, "auditLogs").doc(), { action: "TRANSFER_CREATED", actorUid: ctx.user.uid, targetType: "transfer", targetId: ref.id, createdAt: now });
  });
  return { id: ref.id };
}

/** RECEIVE (destination) or CANCEL (source). Only an IN_TRANSIT transfer can change. */
export async function changeTransfer(ctx, id, action) {
  if (!isSafeId(id)) throw notFound("Transfer not found.");
  const ref = docRef(ctx, "transfers", id);

  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw notFound("Transfer not found.");
    const t = snap.data();
    const receiving = action === "RECEIVE";
    const workBranch = receiving ? t.toBranchId : t.fromBranchId;
    if (!mayUseBranch(ctx, workBranch)) {
      // Visible to either side, but only the right side may act.
      if (!mayUseBranch(ctx, t.fromBranchId) && !mayUseBranch(ctx, t.toBranchId)) throw notFound("Transfer not found.");
      throw forbidden();
    }
    if (t.status !== "IN_TRANSIT") throw conflict("INVALID_STATE", "This transfer is no longer in transit.");

    const destBranch = receiving ? await tx.get(docRef(ctx, "branches", t.toBranchId)) : null;
    const recordRefs = t.items.flatMap((i) => i.imeiRecordIds ?? []);
    const records = await Promise.all(recordRefs.map((rid) => tx.get(docRef(ctx, "imeiRecords", rid))));
    for (const rec of records) {
      if (!rec.exists || rec.data().status !== "IN_TRANSIT") throw conflict("IMEI_NOT_AVAILABLE", "A device on this transfer changed status. Contact your manager.");
    }

    const book = new StockBook(ctx);
    await book.load(tx, t.items.map((i) => ({ variantId: i.variantId, branchId: workBranch })));

    const now = FieldValue.serverTimestamp();
    for (const item of t.items) {
      book.change({
        variantId: item.variantId, branchId: workBranch, productId: item.productId, productName: item.productName,
        variantLabel: item.variantLabel, delta: item.quantity, type: receiving ? "TRANSFER_IN" : "TRANSFER_CANCELLED",
        refType: "transfer", refId: id,
      });
    }
    book.commit(tx);

    for (const rec of records) {
      tx.update(rec.ref, receiving
        ? { status: "IN_STOCK", branchId: t.toBranchId, branchName: destBranch.data()?.name ?? "", updatedAt: now }
        : { status: "IN_STOCK", updatedAt: now });
      tx.set(rec.ref.collection("events").doc(), {
        type: receiving ? "TRANSFER_IN" : "TRANSFER_CANCELLED", detail: { transferId: id, branchId: workBranch },
        actorUid: ctx.user.uid, createdAt: now,
      });
    }
    tx.update(ref, { status: receiving ? "RECEIVED" : "CANCELLED", updatedAt: now });
    tx.set(col(ctx, "auditLogs").doc(), { action: receiving ? "TRANSFER_RECEIVED" : "TRANSFER_CANCELLED", actorUid: ctx.user.uid, targetType: "transfer", targetId: id, createdAt: now });
  });
}
