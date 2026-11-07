import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { StockBook } from "@/lib/inventory/stock";
import { badRequest, conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { refundForUnits, saleStatusAfterReturn, splitRefund } from "./pure";
import { pagedList } from "./sales";

/**
 * Returns, refund records and exchange credit. Needs sales:refund-approve (owner/manager) and access to the sale's branch.
 * A refund first cancels any unpaid balance on a credit sale; only the remainder is paid out (cash, bank, JazzCash,
 * Easypaisa) or issued as exchange credit that a later sale can spend. This records money movements; it does not move money.
 * Returned stock goes back on the shelf only when `restock` is true; otherwise IMEI devices are marked DAMAGED.
 */

const serializeReturn = (d) => {
  const r = d.data();
  return {
    id: d.id, number: r.number, saleId: r.saleId, saleNumber: r.saleNumber, branchId: r.branchId, reason: r.reason, note: r.note ?? "",
    refundMethod: r.refundMethod, reference: r.reference ?? "", refundAmount: r.refundAmount, dueReduction: r.dueReduction, payout: r.payout,
    exchangeId: r.exchangeId ?? null, items: r.items ?? [], createdAt: iso(r.createdAt), createdBy: r.createdBy ?? null,
  };
};

export const listReturns = (ctx, opts) => pagedList(ctx, "returns", serializeReturn, opts);

export async function listExchangeCredits(ctx) {
  const base = col(ctx, "exchanges").where("status", "==", "OPEN");
  const docs = ctx.allBranches ? (await base.limit(200).get()).docs : (await base.limit(500).get()).docs.filter((d) => mayUseBranch(ctx, d.data().branchId));
  return docs.map((d) => ({
    id: d.id, branchId: d.data().branchId, saleNumber: d.data().saleNumber ?? "", returnNumber: d.data().returnNumber ?? "",
    creditAmount: d.data().creditAmount, remaining: d.data().creditAmount - (d.data().usedAmount ?? 0), createdAt: iso(d.data().createdAt),
  }));
}

export async function createReturn(ctx, input) {
  if (!isSafeId(input.saleId)) throw notFound("Sale not found.");
  const variantIds = input.items.map((i) => i.variantId);
  if (new Set(variantIds).size !== variantIds.length) throw badRequest("A product appears twice.");
  const imeiNumbers = input.items.flatMap((i) => i.imeis);
  if (new Set(imeiNumbers).size !== imeiNumbers.length) throw conflict("DUPLICATE_IMEI", "An IMEI appears twice.");

  const saleRef = docRef(ctx, "sales", input.saleId);
  const keyRef = docRef(ctx, "idempotencyKeys", input.returnKey);
  const counterRef = docRef(ctx, "counters", "returns");
  const returnRef = col(ctx, "returns").doc();
  let resultId = returnRef.id;
  let duplicate = false;

  await adminDb().runTransaction(async (tx) => {
    duplicate = false;
    resultId = returnRef.id;
    const [key, sale, counter, costDoc] = await Promise.all([tx.get(keyRef), tx.get(saleRef), tx.get(counterRef), tx.get(docRef(ctx, "saleCosts", input.saleId))]);
    if (key.exists) {
      if (key.data().actorUid !== ctx.user.uid || key.data().type !== "RETURN") throw conflict("KEY_REUSED", "This request key was already used.");
      duplicate = true;
      resultId = key.data().refId;
      return;
    }
    if (!sale.exists || !mayUseBranch(ctx, sale.data().branchId)) throw notFound("Sale not found.");
    const s = sale.data();
    assertBranch(ctx, s.branchId);

    const claims = await Promise.all(imeiNumbers.map((n) => tx.get(docRef(ctx, "imeiClaims", n))));
    if (claims.some((c) => !c.exists)) throw conflict("IMEI_NOT_FOUND", "An IMEI is not registered in your shop.");
    const records = await Promise.all(claims.map((c) => tx.get(docRef(ctx, "imeiRecords", c.data().recordId))));
    const recordByImei = new Map(imeiNumbers.map((n, i) => [n, records[i]]));
    const book = new StockBook(ctx);
    await book.load(tx, input.items.map((i) => ({ variantId: i.variantId, branchId: s.branchId })));

    const now = FieldValue.serverTimestamp();
    const items = s.items.map((it) => ({ ...it, returnedImeiIds: [...(it.returnedImeiIds ?? [])] }));
    let refundAmount = 0;
    let taxRefund = 0;
    let costReversed = 0;
    const costItems = costDoc.exists ? costDoc.data().items ?? [] : [];
    const returnItems = input.items.map((line) => {
      const it = items.find((x) => x.variantId === line.variantId);
      if (!it) throw conflict("NOT_ON_SALE", "A product is not on this sale.");
      const left = it.quantity - (it.returnedQty ?? 0);
      if (line.quantity > left) throw conflict("OVER_RETURN", `${it.productName}: only ${left} unit(s) can still be returned.`);
      const tracked = (it.imeiRecordIds ?? []).length > 0;
      if (tracked) {
        if (line.imeis.length !== line.quantity) throw conflict("IMEI_COUNT", `${it.productName}: enter the IMEI of each of the ${line.quantity} returned device(s).`);
        for (const n of line.imeis) {
          const rec = recordByImei.get(n);
          const r = rec.exists ? rec.data() : null;
          if (!r || !it.imeiRecordIds.includes(rec.id) || it.returnedImeiIds.includes(rec.id) || r.status !== "SOLD") {
            throw conflict("IMEI_NOT_ON_SALE", `IMEI ${n} was not sold on this invoice, or was already returned.`);
          }
          it.returnedImeiIds.push(rec.id);
          tx.update(rec.ref, line.restock
            ? { status: "IN_STOCK", branchId: s.branchId, saleId: FieldValue.delete(), soldAt: FieldValue.delete(), updatedAt: now }
            : { status: "DAMAGED", updatedAt: now });
          tx.set(rec.ref.collection("events").doc(), {
            type: line.restock ? "RETURNED_TO_STOCK" : "RETURNED_DAMAGED", detail: { saleId: input.saleId, returnId: returnRef.id },
            actorUid: ctx.user.uid, createdAt: now,
          });
        }
      } else if (line.imeis.length > 0) {
        throw conflict("IMEI_NOT_TRACKED", `${it.productName} does not track IMEI.`);
      }
      const refund = refundForUnits(it, line.quantity);
      it.returnedQty = (it.returnedQty ?? 0) + line.quantity;
      it.refundedAmount = (it.refundedAmount ?? 0) + refund;
      refundAmount += refund;
      // Tax inside the refund, and (only for items put back on the shelf) the purchase cost that comes back into stock.
      taxRefund += it.lineTotal > 0 ? Math.round((refund * (it.taxShare ?? 0)) / it.lineTotal) : 0;
      if (line.restock) {
        const lineCost = costItems.find((c) => c.variantId === it.variantId)?.costTotal;
        if (lineCost != null) costReversed += Math.floor((lineCost * line.quantity) / it.quantity);
      }
      if (line.restock) {
        book.change({
          variantId: it.variantId, branchId: s.branchId, productId: it.productId, productName: it.productName, variantLabel: it.variantLabel,
          delta: line.quantity, type: "RETURN_IN", refType: "return", refId: returnRef.id,
        });
      }
      return { variantId: it.variantId, productName: it.productName, variantLabel: it.variantLabel, quantity: line.quantity, restock: line.restock, imeis: line.imeis, refundAmount: refund };
    });
    book.commit(tx);

    const { dueReduction, payout } = splitRefund(refundAmount, s.dueAmount ?? 0);
    const n = (counter.exists ? counter.data().next : 1) ?? 1;
    const number = `RET-${String(n).padStart(6, "0")}`;
    tx.set(counterRef, { next: n + 1 });

    let exchangeId = null;
    if (input.refundMethod === "EXCHANGE_CREDIT" && payout > 0) {
      const exRef = col(ctx, "exchanges").doc();
      exchangeId = exRef.id;
      tx.set(exRef, {
        branchId: s.branchId, saleId: input.saleId, saleNumber: s.number, returnId: returnRef.id, returnNumber: number,
        creditAmount: payout, usedAmount: 0, status: "OPEN", createdBy: ctx.user.uid, createdAt: now,
      });
    }
    tx.set(returnRef, {
      number, saleId: input.saleId, saleNumber: s.number, branchId: s.branchId, reason: input.reason, note: input.note,
      refundMethod: input.refundMethod, reference: input.reference, refundAmount, taxRefund, costReversed, dueReduction, payout, exchangeId,
      items: returnItems, createdBy: ctx.user.uid, createdAt: now,
    });
    tx.update(saleRef, {
      items, status: saleStatusAfterReturn(items), dueAmount: (s.dueAmount ?? 0) - dueReduction,
      refundedTotal: (s.refundedTotal ?? 0) + refundAmount, updatedAt: now,
    });
    tx.set(keyRef, { type: "RETURN", refId: returnRef.id, actorUid: ctx.user.uid, createdAt: now });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "SALE_RETURNED", actorUid: ctx.user.uid, targetType: "return", targetId: returnRef.id, createdAt: now,
      detail: { saleNumber: s.number, refundAmount, method: input.refundMethod, reason: input.reason },
    });
  });
  return { id: resultId, duplicate };
}
