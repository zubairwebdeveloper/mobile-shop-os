import "server-only";
import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { classifyCode } from "@/lib/catalog/pure";
import { addMonths, normalizePhone, warrantyDocId, warrantyState } from "@/lib/customers/pure";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { dayKey } from "@/lib/sales/pure";
import { pagedList } from "@/lib/sales/sales";
import { badRequest, conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { getShopSettings } from "@/lib/tenant/settings";

/**
 * Warranty registration, certificate data and claims. One warranty per sold unit: the document id is
 * `${saleId}_${imeiRecordId or variantId}`, so a unit can never be registered twice (even concurrently).
 * "Expired" is computed from the expiry date and the shop's local date; it is never stored.
 * Reads need customers:read. Registering and logging a claim need customers:write; voiding and deciding a claim need sales:refund-approve.
 */

export const serializeWarranty = (d, today) => {
  const w = d.data();
  const { state, daysLeft } = warrantyState(w, today);
  return {
    id: d.id, number: w.number, saleId: w.saleId, saleNumber: w.saleNumber, branchId: w.branchId, customerId: w.customerId ?? null,
    customerName: w.customerName ?? "", customerPhone: w.customerPhone ?? "", variantId: w.variantId, productName: w.productName,
    variantLabel: w.variantLabel, imei1: w.imei1 ?? "", quantity: w.quantity, months: w.months, startDate: w.startDate, expiryDate: w.expiryDate,
    terms: w.terms ?? "", status: w.status, voidReason: w.voidReason ?? "", state, daysLeft, claims: w.claims ?? [], createdAt: iso(w.createdAt),
  };
};

async function todayFor(ctx) {
  const { timezone } = await getShopSettings(ctx);
  return dayKey(new Date(), timezone);
}

export async function listWarranties(ctx, opts = {}) {
  const today = await todayFor(ctx);
  return pagedList(ctx, "warranties", (d) => serializeWarranty(d, today), opts);
}

export async function getWarranty(ctx, id) {
  if (!isSafeId(id)) return null;
  const snap = await docRef(ctx, "warranties", id).get();
  if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) return null;
  return serializeWarranty(snap, await todayFor(ctx));
}

/** Active warranties ending within `days` days, soonest first (in the caller's branches). */
export async function expiringWarranties(ctx, days = 30) {
  const today = await todayFor(ctx);
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  const snap = await col(ctx, "warranties").where("expiryDate", ">=", today).where("expiryDate", "<=", until).limit(500).get();
  return snap.docs
    .filter((d) => d.data().status === "ACTIVE" && mayUseBranch(ctx, d.data().branchId))
    .map((d) => serializeWarranty(d, today))
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

/** Find warranties by IMEI or by customer phone. Only the caller's branches are returned. */
export async function lookupWarranties(ctx, code) {
  const today = await todayFor(ctx);
  const text = String(code ?? "").trim();
  let docs = [];
  if (classifyCode(text).kind === "IMEI") {
    docs = (await col(ctx, "warranties").where("imei1", "==", classifyCode(text).code).limit(20).get()).docs;
  } else {
    const norm = normalizePhone(text);
    if (norm) {
      const claim = await docRef(ctx, "customerPhones", norm).get();
      if (claim.exists) docs = (await col(ctx, "warranties").where("customerId", "==", claim.data().customerId).limit(50).get()).docs;
    }
  }
  return docs.filter((d) => mayUseBranch(ctx, d.data().branchId)).map((d) => serializeWarranty(d, today));
}

export async function registerWarranties(ctx, input) {
  if (!isSafeId(input.saleId)) throw notFound("Sale not found.");
  const saleRef = docRef(ctx, "sales", input.saleId);
  const counterRef = docRef(ctx, "counters", "warranties");
  const expiryDate = addMonths(input.startDate, input.months);
  const ids = [];

  await adminDb().runTransaction(async (tx) => {
    ids.length = 0;
    const [sale, counter] = await Promise.all([tx.get(saleRef), tx.get(counterRef)]);
    if (!sale.exists || !mayUseBranch(ctx, sale.data().branchId)) throw notFound("Sale not found.");
    const s = sale.data();
    assertBranch(ctx, s.branchId);

    const units = [];
    for (const wanted of input.items) {
      const item = s.items.find((i) => i.variantId === wanted.variantId);
      if (!item) throw conflict("NOT_ON_SALE", "A product is not on this sale.");
      const tracked = (item.imeiRecordIds ?? []).length > 0;
      if (tracked) {
        if (wanted.imeis.length === 0) throw conflict("IMEI_COUNT", `${item.productName}: choose the device(s) to cover.`);
        for (const n of wanted.imeis) {
          const at = item.imeis.indexOf(n);
          const recordId = item.imeiRecordIds[at];
          if (at < 0 || (item.returnedImeiIds ?? []).includes(recordId)) throw conflict("IMEI_NOT_ON_SALE", `IMEI ${n} was not sold on this invoice, or was returned.`);
          units.push({ item, key: recordId, imei1: n, quantity: 1 });
        }
      } else {
        if (wanted.imeis.length > 0) throw conflict("IMEI_NOT_TRACKED", `${item.productName} does not track IMEI.`);
        if ((item.returnedQty ?? 0) >= item.quantity) throw conflict("ALREADY_RETURNED", `${item.productName} was returned.`);
        units.push({ item, key: item.variantId, imei1: "", quantity: item.quantity - (item.returnedQty ?? 0) });
      }
    }
    const keys = units.map((u) => u.key);
    if (new Set(keys).size !== keys.length) throw badRequest("A unit is listed twice.");
    const refs = units.map((u) => docRef(ctx, "warranties", warrantyDocId(input.saleId, u.key)));
    const existing = await Promise.all(refs.map((r) => tx.get(r)));
    if (existing.some((e) => e.exists)) throw conflict("ALREADY_REGISTERED", "A warranty is already registered for one of these items.");

    const now = FieldValue.serverTimestamp();
    const first = (counter.exists ? counter.data().next : 1) ?? 1;
    tx.set(counterRef, { next: first + units.length });
    units.forEach((u, i) => {
      ids.push(refs[i].id);
      tx.set(refs[i], {
        number: `WAR-${String(first + i).padStart(6, "0")}`, saleId: input.saleId, saleNumber: s.number, branchId: s.branchId,
        customerId: s.customerId ?? null, customerName: s.customerName ?? "", customerPhone: s.customerPhone ?? "",
        variantId: u.item.variantId, productName: u.item.productName, variantLabel: u.item.variantLabel, imei1: u.imei1,
        quantity: u.quantity, months: input.months, startDate: input.startDate, expiryDate, terms: input.terms, status: "ACTIVE",
        claims: [], createdBy: ctx.user.uid, createdAt: now,
      });
    });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "WARRANTY_REGISTERED", actorUid: ctx.user.uid, targetType: "sale", targetId: input.saleId, createdAt: now,
      detail: { count: units.length, months: input.months },
    });
  });
  return { ids };
}

/** action: VOID | CLAIM_ADD | CLAIM_UPDATE (the route checks the permission that fits the action). */
export async function changeWarranty(ctx, id, input) {
  if (!isSafeId(id)) throw notFound("Warranty not found.");
  const ref = docRef(ctx, "warranties", id);
  const today = await todayFor(ctx);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) throw notFound("Warranty not found.");
    const w = snap.data();
    const { state } = warrantyState(w, today);
    const now = FieldValue.serverTimestamp();
    const nowIso = new Date().toISOString();
    const claims = [...(w.claims ?? [])];
    let patch;
    if (input.action === "VOID") {
      if (w.status === "VOIDED") throw conflict("INVALID_STATE", "This warranty is already void.");
      patch = { status: "VOIDED", voidReason: input.reason };
    } else if (input.action === "CLAIM_ADD") {
      if (state !== "ACTIVE") throw conflict("WARRANTY_NOT_ACTIVE", state === "EXPIRED" ? "This warranty has expired." : "This warranty is void.");
      if (claims.length >= 20) throw conflict("TOO_MANY_CLAIMS", "Too many claims on this warranty.");
      claims.push({ id: randomBytes(6).toString("hex"), description: input.description, status: "OPEN", resolution: "", createdBy: ctx.user.uid, createdAt: nowIso, resolvedAt: null });
      patch = { claims };
    } else {
      const at = claims.findIndex((c) => c.id === input.claimId);
      if (at < 0) throw notFound("Claim not found.");
      if (claims[at].status === "RESOLVED" || claims[at].status === "REJECTED") throw conflict("INVALID_STATE", "This claim is already closed.");
      claims[at] = { ...claims[at], status: input.status, resolution: input.resolution || claims[at].resolution, resolvedAt: input.status === "APPROVED" ? null : nowIso };
      patch = { claims };
    }
    tx.update(ref, { ...patch, updatedAt: now });
    tx.set(col(ctx, "auditLogs").doc(), { action: `WARRANTY_${input.action}`, actorUid: ctx.user.uid, targetType: "warranty", targetId: id, createdAt: now });
  });
  return { ok: true };
}
