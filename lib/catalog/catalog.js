import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { buildVariantDoc, normalizeBarcode } from "./pure";

/**
 * Catalogue services (categories, brands, products, variants). `ctx` MUST come from
 * requireTenantAccess(): the tenant is never taken from request input.
 * Barcodes and SKUs share one per-shop namespace: tenants/{id}/barcodes/{CODE} -> owner.
 */

const iso = (value) => value?.toDate?.().toISOString() ?? null;
const col = (ctx, name) => adminDb().collection(`tenants/${ctx.tenantId}/${name}`);
const doc = (ctx, name, id) => adminDb().doc(`tenants/${ctx.tenantId}/${name}/${id}`);
const audit = (tx, ctx, action, targetType, targetId) =>
  tx.set(col(ctx, "auditLogs").doc(), {
    action,
    actorUid: ctx.user.uid,
    targetType,
    targetId,
    createdAt: FieldValue.serverTimestamp(),
  });

const MAX_CASCADE = 400;

/* ---------- barcode namespace ---------- */


async function readClaims(tx, ctx, codes) {
  const unique = [...new Set(codes.filter(Boolean))];
  const snaps = await Promise.all(unique.map((code) => tx.get(doc(ctx, "barcodes", code))));
  return new Map(unique.map((code, i) => [code, snaps[i]]));
}

/** Throws BARCODE_TAKEN when a wanted code is claimed by someone other than `ownerKey`. */
function assertCodesFree(claims, wanted, ownerKey) {
  for (const code of wanted.filter(Boolean)) {
    const snap = claims.get(code);
    if (snap?.exists && snap.data().ownerKey !== ownerKey) {
      throw conflict("BARCODE_TAKEN", `The code ${code} is already used by another product or variant.`);
    }
  }
}

/* ---------- categories and brands ---------- */

const serializeNamed = (d) => ({
  id: d.id,
  name: d.data().name,
  active: d.data().active !== false,
  tracksImei: d.data().tracksImei === true,
});

export async function listCategories(ctx) {
  const snap = await col(ctx, "categories").orderBy("nameLower", "asc").get();
  return snap.docs.map(serializeNamed);
}

export async function listBrands(ctx) {
  const snap = await col(ctx, "brands").orderBy("nameLower", "asc").get();
  return snap.docs.map(serializeNamed);
}

function namedService(collection, productField, nameField, labels) {
  return {
    async create(ctx, input) {
      const ref = col(ctx, collection).doc();
      const nameLower = input.name.toLowerCase();
      await adminDb().runTransaction(async (tx) => {
        const dup = await tx.get(col(ctx, collection).where("nameLower", "==", nameLower).limit(1));
        if (!dup.empty) throw conflict("NAME_TAKEN", `A ${labels.one} with this name already exists.`);
        tx.set(ref, { ...pickNamed(input), nameLower, createdAt: FieldValue.serverTimestamp(), createdBy: ctx.user.uid });
        audit(tx, ctx, labels.created, labels.one, ref.id);
      });
      return { id: ref.id };
    },
    async update(ctx, id, input) {
      if (!isSafeId(id)) throw notFound(`${labels.title} not found.`);
      const ref = doc(ctx, collection, id);
      const nameLower = input.name.toLowerCase();
      await adminDb().runTransaction(async (tx) => {
        const [snap, dup, products] = await Promise.all([
          tx.get(ref),
          tx.get(col(ctx, collection).where("nameLower", "==", nameLower).limit(2)),
          tx.get(col(ctx, "products").where(productField, "==", id).limit(MAX_CASCADE + 1)),
        ]);
        if (!snap.exists) throw notFound(`${labels.title} not found.`);
        if (dup.docs.some((d) => d.id !== id)) throw conflict("NAME_TAKEN", `A ${labels.one} with this name already exists.`);
        const renamed = snap.data().name !== input.name;
        if (renamed && products.size > MAX_CASCADE) {
          throw conflict("TOO_MANY_PRODUCTS", `Too many products use this ${labels.one} to rename it safely.`);
        }
        tx.update(ref, { ...pickNamed(input), nameLower, updatedAt: FieldValue.serverTimestamp() });
        if (renamed) for (const p of products.docs) tx.update(p.ref, { [nameField]: input.name });
        audit(tx, ctx, labels.updated, labels.one, id);
      });
    },
  };
}

const pickNamed = (input) => {
  const out = { name: input.name, active: input.active !== false };
  if ("tracksImei" in input) out.tracksImei = input.tracksImei === true;
  return out;
};

export const categories = namedService("categories", "categoryId", "categoryName", {
  one: "category",
  title: "Category",
  created: "CATEGORY_CREATED",
  updated: "CATEGORY_UPDATED",
});
export const brands = namedService("brands", "brandId", "brandName", {
  one: "brand",
  title: "Brand",
  created: "BRAND_CREATED",
  updated: "BRAND_UPDATED",
});

/* ---------- products ---------- */

const serializeProduct = (d) => {
  const p = d.data();
  return {
    id: d.id,
    name: p.name,
    brandId: p.brandId,
    brandName: p.brandName ?? "",
    categoryId: p.categoryId,
    categoryName: p.categoryName ?? "",
    tracksImei: p.tracksImei === true,
    description: p.description ?? "",
    specs: p.specs ?? "",
    barcode: p.barcode ?? "",
    status: p.status ?? "ACTIVE",
    variantCount: p.variantCount ?? 0,
  };
};

export const serializeVariant = (d) => {
  const v = d.data();
  return {
    id: d.id,
    productId: v.productId,
    sku: v.sku ?? "",
    barcode: v.barcode ?? "",
    storage: v.storage ?? "",
    ram: v.ram ?? "",
    color: v.color ?? "",
    purchasePrice: v.purchasePrice ?? null,
    sellingPrice: v.sellingPrice ?? null,
    wholesalePrice: v.wholesalePrice ?? null,
    minStock: v.minStock ?? 0,
    status: v.status ?? "ACTIVE",
  };
};

export async function listProducts(ctx, limit = 500) {
  const snap = await col(ctx, "products").orderBy("nameLower", "asc").limit(limit).get();
  return snap.docs.map(serializeProduct);
}

export async function getProduct(ctx, productId) {
  if (!isSafeId(productId)) return null;
  const [snap, variants] = await Promise.all([
    doc(ctx, "products", productId).get(),
    col(ctx, "productVariants").where("productId", "==", productId).get(),
  ]);
  if (!snap.exists) return null;
  return { ...serializeProduct(snap), variants: variants.docs.map(serializeVariant) };
}

export async function createProduct(ctx, input) {
  const ref = col(ctx, "products").doc();
  const code = normalizeBarcode(input.barcode);

  await adminDb().runTransaction(async (tx) => {
    const [brand, category, claims] = await Promise.all([
      tx.get(doc(ctx, "brands", input.brandId)),
      tx.get(doc(ctx, "categories", input.categoryId)),
      readClaims(tx, ctx, [code]),
    ]);
    if (!brand.exists || brand.data().active === false) throw conflict("BRAND_UNAVAILABLE", "Choose an active brand.");
    if (!category.exists || category.data().active === false) throw conflict("CATEGORY_UNAVAILABLE", "Choose an active category.");
    assertCodesFree(claims, [code], `product:${ref.id}`);

    const now = FieldValue.serverTimestamp();
    tx.set(ref, {
      name: input.name,
      nameLower: input.name.toLowerCase(),
      brandId: input.brandId,
      brandName: brand.data().name,
      categoryId: input.categoryId,
      categoryName: category.data().name,
      tracksImei: category.data().tracksImei === true,
      description: input.description,
      specs: input.specs,
      barcode: code || null,
      status: input.status,
      variantCount: 0,
      createdAt: now,
      createdBy: ctx.user.uid,
    });
    if (code) tx.set(doc(ctx, "barcodes", code), { ownerKey: `product:${ref.id}`, type: "PRODUCT", productId: ref.id });
    audit(tx, ctx, "PRODUCT_CREATED", "product", ref.id);
  });
  return { id: ref.id };
}

export async function updateProduct(ctx, productId, input) {
  if (!isSafeId(productId)) throw notFound("Product not found.");
  const ref = doc(ctx, "products", productId);
  const code = normalizeBarcode(input.barcode);

  await adminDb().runTransaction(async (tx) => {
    const [snap, brand, category] = await Promise.all([
      tx.get(ref),
      tx.get(doc(ctx, "brands", input.brandId)),
      tx.get(doc(ctx, "categories", input.categoryId)),
    ]);
    if (!snap.exists) throw notFound("Product not found.");
    const old = snap.data();
    if (!brand.exists || (brand.data().active === false && old.brandId !== input.brandId)) {
      throw conflict("BRAND_UNAVAILABLE", "Choose an active brand.");
    }
    if (!category.exists || (category.data().active === false && old.categoryId !== input.categoryId)) {
      throw conflict("CATEGORY_UNAVAILABLE", "Choose an active category.");
    }
    const claims = await readClaims(tx, ctx, [code]);
    assertCodesFree(claims, [code], `product:${productId}`);

    tx.update(ref, {
      name: input.name,
      nameLower: input.name.toLowerCase(),
      brandId: input.brandId,
      brandName: brand.data().name,
      categoryId: input.categoryId,
      categoryName: category.data().name,
      tracksImei: category.data().tracksImei === true,
      description: input.description,
      specs: input.specs,
      barcode: code || null,
      status: input.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (old.barcode && old.barcode !== code) tx.delete(doc(ctx, "barcodes", old.barcode));
    if (code) tx.set(doc(ctx, "barcodes", code), { ownerKey: `product:${productId}`, type: "PRODUCT", productId });
    audit(tx, ctx, "PRODUCT_UPDATED", "product", productId);
  });
}

/* ---------- variants ---------- */

export async function createVariant(ctx, productId, input) {
  if (!isSafeId(productId)) throw notFound("Product not found.");
  const ref = col(ctx, "productVariants").doc();
  const data = buildVariantDoc(input);
  const codes = [data.sku, data.barcode];
  const ownerKey = `variant:${ref.id}`;

  await adminDb().runTransaction(async (tx) => {
    const [product, claims] = await Promise.all([tx.get(doc(ctx, "products", productId)), readClaims(tx, ctx, codes)]);
    if (!product.exists) throw notFound("Product not found.");
    if (data.sku && data.sku === data.barcode) throw conflict("BARCODE_TAKEN", "SKU and barcode must differ.");
    assertCodesFree(claims, codes, ownerKey);

    tx.set(ref, { ...data, productId, createdAt: FieldValue.serverTimestamp(), createdBy: ctx.user.uid });
    tx.update(product.ref, { variantCount: FieldValue.increment(1) });
    for (const code of codes.filter(Boolean)) {
      tx.set(doc(ctx, "barcodes", code), { ownerKey, type: "VARIANT", productId, variantId: ref.id });
    }
    audit(tx, ctx, "VARIANT_CREATED", "variant", ref.id);
  });
  return { id: ref.id };
}

export async function updateVariant(ctx, variantId, input) {
  if (!isSafeId(variantId)) throw notFound("Variant not found.");
  const ref = doc(ctx, "productVariants", variantId);
  const data = buildVariantDoc(input);
  const codes = [data.sku, data.barcode];
  const ownerKey = `variant:${variantId}`;

  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw notFound("Variant not found.");
    const old = snap.data();
    const claims = await readClaims(tx, ctx, codes);
    if (data.sku && data.sku === data.barcode) throw conflict("BARCODE_TAKEN", "SKU and barcode must differ.");
    assertCodesFree(claims, codes, ownerKey);

    tx.update(ref, { ...data, updatedAt: FieldValue.serverTimestamp() });
    for (const oldCode of [old.sku, old.barcode].filter(Boolean)) {
      if (!codes.includes(oldCode)) tx.delete(doc(ctx, "barcodes", oldCode));
    }
    for (const code of codes.filter(Boolean)) {
      tx.set(doc(ctx, "barcodes", code), { ownerKey, type: "VARIANT", productId: old.productId, variantId });
    }
    audit(tx, ctx, "VARIANT_UPDATED", "variant", variantId);
  });
}


