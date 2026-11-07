import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { canAccessBranch } from "@/lib/permissions/matrix";
import { conflict, forbidden, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { imeiStockEffect } from "@/lib/inventory/pure";
import { StockBook } from "@/lib/inventory/stock";
import { IMEI_STATUSES } from "@/lib/validations/catalog";
import { matchesQuery, rupeesToPaisa, variantLabel } from "./pure";

/**
 * IMEI records. Uniqueness: every IMEI (IMEI 1 and IMEI 2) is claimed in tenants/{id}/imeiClaims/{imei}
 * inside the same transaction that writes the record, so two simultaneous registrations cannot both win,
 * and a number cannot appear as IMEI 1 on one record and IMEI 2 on another. Claims are per shop: another
 * shop registering the same number is a separate record and never learns about this one.
 *
 * Branch isolation: the member's branch scope applies to listing, reading, creating and moving records.
 * Stock: an IMEI-tracked variant's branch quantity equals its IN_STOCK devices there. Registering, changing
 * status or moving a device updates the inventory counter and writes a stock movement in the same transaction.
 * IMEI numbers are checked for FORMAT and check digit only. No official PTA or manufacturer verification is claimed.
 */

const iso = (value) => value?.toDate?.().toISOString() ?? null;
const col = (ctx, name) => adminDb().collection(`tenants/${ctx.tenantId}/${name}`);
const doc = (ctx, name, id) => adminDb().doc(`tenants/${ctx.tenantId}/${name}/${id}`);
const scope = (ctx) => ({ allBranches: ctx.allBranches, branchIds: ctx.branchIds });
const mayUse = (ctx, branchId) => canAccessBranch(scope(ctx), branchId);

const serialize = (d) => {
  const r = d.data();
  return {
    id: d.id,
    imei1: r.imei1,
    imei2: r.imei2 ?? "",
    serialNumber: r.serialNumber ?? "",
    productId: r.productId,
    variantId: r.variantId,
    productName: r.productName ?? "",
    variantLabel: r.variantLabel ?? "",
    branchId: r.branchId,
    branchName: r.branchName ?? "",
    status: r.status,
    condition: r.condition,
    purchasePrice: r.purchasePrice ?? null,
    notes: r.notes ?? "",
    createdAt: iso(r.createdAt),
  };
};

/**
 * Stages the writes for a NEW device (record, IMEI claims, history event). Caller has already read the
 * claims and verified they are free. Used by manual registration and by purchase receiving.
 */
export function stageNewImei(tx, ctx, ref, data) {
  const now = FieldValue.serverTimestamp();
  tx.set(ref, {
    imei1: data.imei1,
    imei2: data.imei2 || null,
    serialNumber: data.serialNumber ?? "",
    productId: data.productId,
    variantId: data.variantId,
    productName: data.productName,
    variantLabel: data.variantLabel,
    branchId: data.branchId,
    branchName: data.branchName ?? "",
    status: "IN_STOCK",
    condition: data.condition ?? "NEW",
    purchasePrice: data.purchasePrice ?? null,
    supplierId: data.supplierId ?? null,
    purchaseId: data.purchaseId ?? null,
    notes: data.notes ?? "",
    createdAt: now,
    createdBy: ctx.user.uid,
  });
  for (const imei of [data.imei1, data.imei2].filter(Boolean)) {
    tx.set(doc(ctx, "imeiClaims", imei), { recordId: ref.id });
  }
  tx.set(ref.collection("events").doc(), {
    type: "REGISTERED",
    detail: { branchId: data.branchId, status: "IN_STOCK", purchaseId: data.purchaseId ?? null },
    actorUid: ctx.user.uid,
    createdAt: now,
  });
}

export async function listImeiRecords(ctx, { q = "", limit = 300 } = {}) {
  const base = col(ctx, "imeiRecords");
  let docs;
  if (ctx.allBranches) {
    docs = (await base.orderBy("createdAt", "desc").limit(limit).get()).docs;
  } else if (ctx.branchIds.length === 0) {
    docs = [];
  } else {
    const chunks = [];
    for (let i = 0; i < ctx.branchIds.length; i += 10) chunks.push(ctx.branchIds.slice(i, i + 10));
    const snaps = await Promise.all(chunks.map((ids) => base.where("branchId", "in", ids).limit(limit).get()));
    docs = snaps.flatMap((s) => s.docs);
  }
  return docs
    .map(serialize)
    .filter((r) => matchesQuery(q, r.imei1, r.imei2, r.serialNumber, r.productName))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, limit);
}

export async function getImeiRecord(ctx, id) {
  if (!isSafeId(id)) return null;
  const snap = await doc(ctx, "imeiRecords", id).get();
  // A record in a branch the member cannot access looks exactly like a missing one.
  if (!snap.exists || !mayUse(ctx, snap.data().branchId)) return null;
  const events = await doc(ctx, "imeiRecords", id).collection("events").orderBy("createdAt", "desc").limit(50).get();
  return {
    ...serialize(snap),
    events: events.docs.map((e) => ({
      id: e.id,
      type: e.data().type,
      detail: e.data().detail ?? null,
      actorUid: e.data().actorUid ?? null,
      createdAt: iso(e.data().createdAt),
    })),
  };
}

export async function registerImei(ctx, input) {
  if (!mayUse(ctx, input.branchId)) throw forbidden();
  const ref = col(ctx, "imeiRecords").doc();
  const imeis = [input.imei1, input.imei2].filter(Boolean);

  await adminDb().runTransaction(async (tx) => {
    const [variant, branch, ...claims] = await Promise.all([
      tx.get(doc(ctx, "productVariants", input.variantId)),
      tx.get(doc(ctx, "branches", input.branchId)),
      ...imeis.map((imei) => tx.get(doc(ctx, "imeiClaims", imei))),
    ]);
    if (!variant.exists) throw notFound("Variant not found.");
    if (variant.data().status !== "ACTIVE") throw conflict("VARIANT_ARCHIVED", "This variant is archived.");
    const product = await tx.get(doc(ctx, "products", variant.data().productId));
    if (!product.exists || product.data().status !== "ACTIVE") throw conflict("PRODUCT_ARCHIVED", "This product is archived.");
    if (product.data().tracksImei !== true) {
      throw conflict("NOT_IMEI_TRACKED", "This product's category does not track IMEI. Turn it on in the category first.");
    }
    if (!branch.exists || branch.data().active === false) throw notFound("Branch not found.");
    if (claims.some((c) => c.exists)) {
      throw conflict("IMEI_EXISTS", "This IMEI is already registered in your shop.");
    }

    const book = new StockBook(ctx);
    await book.load(tx, [{ variantId: variant.id, branchId: input.branchId }]);

    const now = FieldValue.serverTimestamp();
    const label = variantLabel(variant.data());
    stageNewImei(tx, ctx, ref, {
      ...input,
      productId: product.id,
      variantId: variant.id,
      productName: product.data().name,
      variantLabel: label,
      branchName: branch.data().name ?? "",
      purchasePrice: rupeesToPaisa(input.purchasePrice),
    });
    book.change({
      variantId: variant.id, branchId: input.branchId, productId: product.id, productName: product.data().name,
      variantLabel: label, delta: 1, type: "IMEI_REGISTERED", refType: "imei", refId: ref.id,
    });
    book.commit(tx);
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "IMEI_REGISTERED",
      actorUid: ctx.user.uid,
      targetType: "imei",
      targetId: ref.id,
      createdAt: now,
    });
  });
  return { id: ref.id };
}

/** Editable only while the device is in a manual status; SOLD/RETURNED etc. are owned by later phases. */
export async function updateImei(ctx, id, input) {
  if (!isSafeId(id)) throw notFound("Device not found.");
  if (!mayUse(ctx, input.branchId)) throw forbidden();
  const ref = doc(ctx, "imeiRecords", id);

  await adminDb().runTransaction(async (tx) => {
    const [snap, branch] = await Promise.all([tx.get(ref), tx.get(doc(ctx, "branches", input.branchId))]);
    if (!snap.exists || !mayUse(ctx, snap.data().branchId)) throw notFound("Device not found.");
    const old = snap.data();
    if (!IMEI_STATUSES.includes(old.status)) {
      throw conflict("IMEI_LOCKED", "This device's status is managed by sales and returns and cannot be edited here.");
    }
    if (!branch.exists || branch.data().active === false) throw notFound("Branch not found.");

    const effects = imeiStockEffect(old, input);
    const book = new StockBook(ctx);
    await book.load(tx, effects.map((e) => ({ variantId: old.variantId, branchId: e.branchId })));
    for (const effect of effects) {
      book.change({
        variantId: old.variantId, branchId: effect.branchId, productId: old.productId, productName: old.productName,
        variantLabel: old.variantLabel, delta: effect.delta, type: old.branchId !== input.branchId ? "IMEI_MOVED" : "IMEI_STATUS",
        refType: "imei", refId: id, reason: input.status,
      });
    }
    book.commit(tx);

    const now = FieldValue.serverTimestamp();
    tx.update(ref, {
      status: input.status,
      condition: input.condition,
      branchId: input.branchId,
      branchName: branch.data().name ?? "",
      serialNumber: input.serialNumber,
      notes: input.notes,
      updatedAt: now,
    });
    tx.set(ref.collection("events").doc(), {
      type: "UPDATED",
      detail: {
        fromStatus: old.status,
        toStatus: input.status,
        fromBranchId: old.branchId,
        toBranchId: input.branchId,
        fromCondition: old.condition,
        toCondition: input.condition,
      },
      actorUid: ctx.user.uid,
      createdAt: now,
    });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "IMEI_UPDATED",
      actorUid: ctx.user.uid,
      targetType: "imei",
      targetId: id,
      createdAt: now,
    });
  });
}
