import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { rupeesToPaisa, variantLabel } from "@/lib/catalog/pure";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { StockBook } from "@/lib/inventory/stock";
import { badRequest, conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { computeSale, invoiceNumber, MAX_SALE_IMEI_UNITS, settlePayments, taxPercentToBps } from "./pure";

/**
 * Sales (POS checkout). One Firestore transaction per sale: idempotency key, invoice number, price lookup,
 * stock and IMEI devices, exchange credit and the sale document all change together or not at all.
 * Prices ALWAYS come from the catalogue on the server; the browser only says what and how many.
 * ctx MUST come from requireTenantAccess(sales:create) for writes and sales:read for reads.
 */

const serializeItem = (i) => ({
  variantId: i.variantId, productId: i.productId, productName: i.productName, variantLabel: i.variantLabel,
  quantity: i.quantity, unitPrice: i.unitPrice, lineDiscount: i.lineDiscount, orderDiscountShare: i.orderDiscountShare,
  taxShare: i.taxShare, lineTotal: i.lineTotal, imeis: i.imeis ?? [],
  returnableImeis: (i.imeis ?? []).filter((_, n) => !(i.returnedImeiIds ?? []).includes((i.imeiRecordIds ?? [])[n])),
  returnedQty: i.returnedQty ?? 0, refundedAmount: i.refundedAmount ?? 0,
});

export const serializeSale = (d) => {
  const s = d.data();
  return {
    id: d.id, number: s.number, branchId: s.branchId, customerId: s.customerId ?? null, branchName: s.branchName ?? "", status: s.status,
    customerName: s.customerName ?? "", customerPhone: s.customerPhone ?? "", note: s.note ?? "",
    subtotal: s.subtotal, lineDiscountTotal: s.lineDiscountTotal, orderDiscount: s.orderDiscount, taxBps: s.taxBps,
    taxAmount: s.taxAmount, total: s.total, payments: s.payments ?? [], paidAmount: s.paidAmount, dueAmount: s.dueAmount,
    changeGiven: s.changeGiven ?? 0, paymentStatus: s.paymentStatus, refundedTotal: s.refundedTotal ?? 0,
    items: (s.items ?? []).map(serializeItem), createdBy: s.createdBy ?? null, createdAt: iso(s.createdAt),
  };
};

async function scopedQuery(ctx, name, orderField = "createdAt") {
  const base = col(ctx, name);
  if (ctx.allBranches) return base.orderBy(orderField, "desc");
  if (ctx.branchIds.length === 0) return null;
  return base.where("branchId", "in", ctx.branchIds.slice(0, 30)).orderBy(orderField, "desc");
}

export async function pagedList(ctx, name, serialize, { limit = 50, cursor } = {}) {
  let query = await scopedQuery(ctx, name);
  if (!query) return { entries: [], nextCursor: null };
  if (isSafeId(cursor)) {
    const snap = await docRef(ctx, name, cursor).get();
    if (snap.exists) query = query.startAfter(snap);
  }
  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  return { entries: docs.map(serialize), nextCursor: snap.docs.length > limit ? docs[docs.length - 1].id : null };
}

export const listSales = (ctx, opts) => pagedList(ctx, "sales", serializeSale, opts);

/** null when missing OR in a branch the caller cannot access (indistinguishable). */
export async function getSale(ctx, id) {
  if (!isSafeId(id)) return null;
  const snap = await docRef(ctx, "sales", id).get();
  if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) return null;
  return serializeSale(snap);
}

export async function createSale(ctx, input) {
  assertBranch(ctx, input.branchId);
  const variantIds = input.items.map((i) => i.variantId);
  if (new Set(variantIds).size !== variantIds.length) throw badRequest("A product appears twice. Change its quantity instead.");
  const allImeis = input.items.flatMap((i) => i.imeis);
  if (allImeis.length > MAX_SALE_IMEI_UNITS) throw conflict("TOO_MANY_UNITS", `Sell at most ${MAX_SALE_IMEI_UNITS} IMEI-tracked units in one sale.`);
  if (new Set(allImeis).size !== allImeis.length) throw conflict("DUPLICATE_IMEI", "An IMEI appears twice.");

  const taxBps = taxPercentToBps(input.taxPercent) ?? 0;
  const saleRef = col(ctx, "sales").doc();
  const keyRef = docRef(ctx, "idempotencyKeys", input.saleKey);
  const counterRef = docRef(ctx, "counters", "sales");
  let resultId = saleRef.id;
  let duplicate = false;

  await adminDb().runTransaction(async (tx) => {
    duplicate = false;
    resultId = saleRef.id;
    const exchangePayments = input.payments.filter((p) => p.method === "EXCHANGE_CREDIT");
    const [key, counter, branch, customer, ...rest] = await Promise.all([
      tx.get(keyRef),
      tx.get(counterRef),
      tx.get(docRef(ctx, "branches", input.branchId)),
      input.customerId ? tx.get(docRef(ctx, "customers", input.customerId)) : null,
      ...variantIds.map((id) => tx.get(docRef(ctx, "productVariants", id))),
    ]);
    const variants = rest;
    if (key.exists) {
      if (key.data().actorUid !== ctx.user.uid || key.data().type !== "SALE") throw conflict("KEY_REUSED", "This request key was already used.");
      duplicate = true;
      resultId = key.data().refId;
      return;
    }
    if (!branch.exists || branch.data().active === false) throw notFound("Branch not found.");
    if (customer && (!customer.exists || customer.data().status === "ARCHIVED")) throw notFound("Customer not found.");
    if (variants.some((v) => !v.exists)) throw notFound("A product was not found.");
    const products = await Promise.all(variants.map((v) => tx.get(docRef(ctx, "products", v.data().productId))));
    const exchanges = await Promise.all(exchangePayments.map((p) => tx.get(docRef(ctx, "exchanges", p.exchangeId))));
    const claims = await Promise.all(allImeis.map((n) => tx.get(docRef(ctx, "imeiClaims", n))));
    if (claims.some((c) => !c.exists)) throw conflict("IMEI_NOT_FOUND", "An IMEI is not registered in your shop.");
    const records = await Promise.all(claims.map((c) => tx.get(docRef(ctx, "imeiRecords", c.data().recordId))));
    const recordByImei = new Map(allImeis.map((n, i) => [n, records[i]]));
    const book = new StockBook(ctx);
    await book.load(tx, variantIds.map((variantId) => ({ variantId, branchId: input.branchId })));

    // Price every line from the catalogue.
    const priced = input.items.map((line, idx) => {
      const v = variants[idx];
      const p = products[idx];
      if (!p.exists || p.data().status !== "ACTIVE" || v.data().status !== "ACTIVE") {
        throw conflict("ITEM_UNAVAILABLE", `${p.exists ? p.data().name : "A product"} is not available for sale.`);
      }
      const price = v.data().sellingPrice;
      if (!Number.isInteger(price) || price <= 0) throw conflict("ITEM_UNAVAILABLE", `${p.data().name} has no selling price.`);
      return { line, v, p, unitPrice: price, discount: rupeesToPaisa(line.discount) ?? 0 };
    });
    const calc = computeSale({
      lines: priced.map((x) => ({ unitPrice: x.unitPrice, quantity: x.line.quantity, discount: x.discount })),
      orderDiscount: rupeesToPaisa(input.orderDiscount) ?? 0,
      taxBps,
    });
    if (!calc.ok) throw conflict(calc.code, calc.message);

    const payments = input.payments.map((p) => ({ method: p.method, amount: rupeesToPaisa(p.amount), reference: p.reference ?? "", exchangeId: p.exchangeId ?? null }));
    // A chosen customer record wins over typed name/phone; otherwise a typed name + phone is a one-off snapshot.
    const customerName = customer ? customer.data().name : input.customerName;
    const customerPhone = customer ? customer.data().phone : input.customerPhone;
    const hasCustomer = customerName.length >= 2 && customerPhone.length > 0;
    const settled = settlePayments(calc.total, payments, { hasCustomer });
    if (!settled.ok) throw conflict(settled.code, settled.message);

    // Exchange credit may only be spent up to what is left on it.
    const now = FieldValue.serverTimestamp();
    exchangePayments.forEach((p, i) => {
      const ex = exchanges[i];
      const amount = settled.payments.find((x) => x.method === "EXCHANGE_CREDIT")?.amount ?? 0;
      if (!ex.exists || !mayUseBranch(ctx, ex.data().branchId)) throw notFound("Exchange credit not found.");
      const left = ex.data().creditAmount - (ex.data().usedAmount ?? 0);
      if (ex.data().status !== "OPEN" || amount > left) throw conflict("EXCHANGE_CREDIT_LOW", "That exchange credit has less than the amount entered.");
      const used = (ex.data().usedAmount ?? 0) + amount;
      tx.update(ex.ref, { usedAmount: used, status: used >= ex.data().creditAmount ? "USED" : "OPEN", updatedAt: now });
    });

    const costs = [];
    const items = priced.map((x, idx) => {
      const { line, v, p } = x;
      const label = variantLabel(v.data());
      const tracked = p.data().tracksImei === true;
      let imeiRecordIds = [];
      let costTotal = (v.data().purchasePrice ?? null) === null ? null : v.data().purchasePrice * line.quantity;
      if (tracked) {
        if (line.imeis.length !== line.quantity) throw conflict("IMEI_COUNT", `${p.data().name}: choose exactly ${line.quantity} device(s) by IMEI.`);
        let cost = 0;
        let known = true;
        imeiRecordIds = line.imeis.map((n) => {
          const rec = recordByImei.get(n);
          const r = rec.exists ? rec.data() : null;
          if (!r || r.variantId !== v.id || r.branchId !== input.branchId || r.status !== "IN_STOCK") {
            throw conflict("IMEI_NOT_AVAILABLE", `IMEI ${n} is not in stock at this branch.`);
          }
          const unitCost = r.purchasePrice ?? v.data().purchasePrice ?? null;
          if (unitCost === null) known = false;
          else cost += unitCost;
          tx.update(rec.ref, { status: "SOLD", saleId: saleRef.id, soldAt: now, updatedAt: now });
          tx.set(rec.ref.collection("events").doc(), { type: "SOLD", detail: { saleId: saleRef.id }, actorUid: ctx.user.uid, createdAt: now });
          return rec.id;
        });
        costTotal = known ? cost : null;
      } else if (line.imeis.length > 0) {
        throw conflict("IMEI_NOT_TRACKED", `${p.data().name} does not track IMEI.`);
      }
      book.change({
        variantId: v.id, branchId: input.branchId, productId: p.id, productName: p.data().name, variantLabel: label,
        delta: -line.quantity, type: "SALE", refType: "sale", refId: saleRef.id,
      });
      const c = calc.lines[idx];
      costs.push({ variantId: v.id, costTotal });
      return {
        variantId: v.id, productId: p.id, productName: p.data().name, variantLabel: label, quantity: line.quantity,
        unitPrice: x.unitPrice, lineDiscount: c.lineDiscount, orderDiscountShare: c.orderDiscountShare, taxShare: c.taxShare,
        lineTotal: c.lineTotal, imeis: line.imeis, imeiRecordIds, returnedQty: 0, refundedAmount: 0, returnedImeiIds: [],
      };
    });
    book.commit(tx);

    const number = invoiceNumber((counter.exists ? counter.data().next : 1) ?? 1);
    tx.set(counterRef, { next: ((counter.exists ? counter.data().next : 1) ?? 1) + 1 });
    tx.set(saleRef, {
      number, branchId: input.branchId, branchName: branch.data().name ?? "", status: "COMPLETED",
      customerId: customer ? customer.id : null, customerName, customerPhone, note: input.note,
      subtotal: calc.subtotal, lineDiscountTotal: calc.lineDiscountTotal, orderDiscount: calc.orderDiscount, taxBps,
      taxAmount: calc.taxAmount, total: calc.total, payments: settled.payments, paidAmount: settled.paidAmount,
      dueAmount: settled.dueAmount, changeGiven: settled.changeGiven, paymentStatus: settled.paymentStatus,
      refundedTotal: 0, items, createdBy: ctx.user.uid, createdAt: now,
    });
    tx.set(docRef(ctx, "saleCosts", saleRef.id), { branchId: input.branchId, items: costs, createdAt: now });
    tx.set(keyRef, { type: "SALE", refId: saleRef.id, actorUid: ctx.user.uid, createdAt: now });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "SALE_CREATED", actorUid: ctx.user.uid, targetType: "sale", targetId: saleRef.id, createdAt: now,
      detail: { number, total: calc.total, discount: calc.lineDiscountTotal + calc.orderDiscount, paymentStatus: settled.paymentStatus },
    });
  });
  return { id: resultId, duplicate };
}
