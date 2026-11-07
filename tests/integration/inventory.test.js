/**
 * Integration tests for Phase 7 services against the Firebase EMULATORS (real Admin SDK).
 * Run with:  npm run test:integration
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { brands, categories, createProduct, createVariant } from "@/lib/catalog/catalog";
import { getImeiRecord, registerImei, updateImei } from "@/lib/catalog/imei";
import { adjustStock } from "@/lib/inventory/adjust";
import { changePurchaseStatus, createPurchase, getPurchase, listPurchases, receivePurchase } from "@/lib/inventory/purchases";
import { getLowStock, listInventory, listMovements } from "@/lib/inventory/queries";
import { recountImeiInventory } from "@/lib/inventory/recount";
import { createSupplier } from "@/lib/inventory/suppliers";
import { changeTransfer, createTransfer, listTransfers } from "@/lib/inventory/transfers";
import { listBranches } from "@/lib/tenant/branches";
import { approveApplication, submitApplication } from "@/lib/tenant/onboarding";

const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID || "demo-msos";
const ADMIN = "platform-admin";
const I1 = "490154203237518";
const I2 = "356938035643809";

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Run these tests through the emulators: npm run test:integration");
  }
});

beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
});

async function makeShop(uid = "owner", slug = "shop-one") {
  await adminAuth().createUser({ uid, email: `${uid}@example.test`, emailVerified: true, displayName: uid, password: "Test#12345" });
  await submitApplication({ uid, email: `${uid}@example.test` }, {
    shopName: `Shop ${slug}`, slug, ownerName: "Owner", phone: "+92 300 1234567",
    city: "Lahore", address: "Hall Road, Lahore", expectedBranches: 1,
  });
  const { tenantId } = await approveApplication(ADMIN, uid);
  const ctx = { tenantId, role: "OWNER", user: { uid }, allBranches: true, branchIds: [] };
  const mainId = (await listBranches(ctx))[0].id;
  const second = adminDb().collection(`tenants/${tenantId}/branches`).doc();
  await second.set({ name: "Branch B", active: true, createdAt: new Date() });
  const scopedMain = { ...ctx, role: "MANAGER", allBranches: false, branchIds: [mainId] };
  return { ctx, tenantId, mainId, otherId: second.id, scopedMain };
}

async function seed(shop) {
  const { ctx } = shop;
  const { id: phones } = await categories.create(ctx, { name: "Phones", tracksImei: true, active: true });
  const { id: acc } = await categories.create(ctx, { name: "Accessories", tracksImei: false, active: true });
  const { id: brandId } = await brands.create(ctx, { name: "Generic", active: true });
  const mk = async (name, categoryId, minStock = 0) => {
    const { id: productId } = await createProduct(ctx, { name, brandId, categoryId, description: "", specs: "", barcode: "", status: "ACTIVE" });
    const { id: variantId } = await createVariant(ctx, productId, { storage: "", ram: "", color: "", sku: "", barcode: "", purchasePrice: "1000", sellingPrice: "1500", wholesalePrice: "", minStock, status: "ACTIVE" });
    return { productId, variantId };
  };
  const phone = await mk("Phone X", phones, 2);
  const caseItem = await mk("Case Y", acc, 5);
  const { id: supplierId } = await createSupplier(ctx, { name: "Sup One", phone: "", city: "", address: "", notes: "", active: true });
  return { phone, caseItem, supplierId };
}

const qty = async (ctx, variantId, branchId) => {
  const snap = await adminDb().doc(`tenants/${ctx.tenantId}/inventory/${variantId}_${branchId}`).get();
  return snap.exists ? snap.data().quantity : 0;
};

const po = (shop, s, items) => ({ supplierId: s.supplierId, branchId: shop.mainId, note: "", items });
const lines = (...l) => ({ receiptKey: `key${Math.random().toString(16).slice(2)}`, lines: l });

describe("purchase orders", () => {
  it("numbers orders sequentially and follows DRAFT -> ORDERED -> CANCELLED", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const a = await createPurchase(shop.ctx, po(shop, s, [{ variantId: s.caseItem.variantId, quantity: 10, unitCost: "500" }]));
    const b = await createPurchase(shop.ctx, po(shop, s, [{ variantId: s.caseItem.variantId, quantity: 1, unitCost: "500" }]));
    expect((await getPurchase(shop.ctx, a.id)).number).toBe("PO-000001");
    expect((await getPurchase(shop.ctx, b.id)).number).toBe("PO-000002");
    await expect(receivePurchase(shop.ctx, a.id, lines({ variantId: s.caseItem.variantId, quantity: 1, imeis: [] }))).rejects.toMatchObject({ code: "INVALID_STATE" });
    await changePurchaseStatus(shop.ctx, a.id, "ORDER");
    await changePurchaseStatus(shop.ctx, a.id, "CANCEL");
    expect((await getPurchase(shop.ctx, a.id)).status).toBe("CANCELLED");
    await expect(changePurchaseStatus(shop.ctx, a.id, "ORDER")).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
  it("two simultaneous orders get different numbers", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const input = po(shop, s, [{ variantId: s.caseItem.variantId, quantity: 1, unitCost: "1" }]);
    await Promise.all([createPurchase(shop.ctx, input), createPurchase(shop.ctx, input), createPurchase(shop.ctx, input)]);
    const numbers = (await listPurchases(shop.ctx)).map((p) => p.number).sort();
    expect(numbers).toEqual(["PO-000001", "PO-000002", "PO-000003"]);
  });
});

describe("receiving", () => {
  async function ordered(shop, s, items) {
    const { id } = await createPurchase(shop.ctx, po(shop, s, items));
    await changePurchaseStatus(shop.ctx, id, "ORDER");
    return id;
  }

  it("receives plain stock in parts, writes movements and completes the order", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const id = await ordered(shop, s, [{ variantId: s.caseItem.variantId, quantity: 10, unitCost: "500" }]);
    await receivePurchase(shop.ctx, id, lines({ variantId: s.caseItem.variantId, quantity: 4, imeis: [] }));
    expect((await getPurchase(shop.ctx, id)).status).toBe("PARTIALLY_RECEIVED");
    await receivePurchase(shop.ctx, id, lines({ variantId: s.caseItem.variantId, quantity: 6, imeis: [] }));
    expect((await getPurchase(shop.ctx, id)).status).toBe("RECEIVED");
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.mainId)).toBe(10);
    const { entries } = await listMovements(shop.ctx, { limit: 50 });
    expect(entries.filter((m) => m.type === "RECEIVE").map((m) => m.quantityAfter).sort((a, b) => a - b)).toEqual([4, 10]);
  });

  it("refuses over-receipt and a finished order", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const id = await ordered(shop, s, [{ variantId: s.caseItem.variantId, quantity: 2, unitCost: "500" }]);
    await expect(receivePurchase(shop.ctx, id, lines({ variantId: s.caseItem.variantId, quantity: 3, imeis: [] }))).rejects.toMatchObject({ code: "OVER_RECEIPT" });
    await receivePurchase(shop.ctx, id, lines({ variantId: s.caseItem.variantId, quantity: 2, imeis: [] }));
    await expect(receivePurchase(shop.ctx, id, lines({ variantId: s.caseItem.variantId, quantity: 1, imeis: [] }))).rejects.toMatchObject({ code: "INVALID_STATE" });
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.mainId)).toBe(2);
  });

  it("is idempotent for the same receiptKey, even when sent twice at once", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const id = await ordered(shop, s, [{ variantId: s.caseItem.variantId, quantity: 10, unitCost: "500" }]);
    const body = lines({ variantId: s.caseItem.variantId, quantity: 3, imeis: [] });
    await Promise.all([receivePurchase(shop.ctx, id, body), receivePurchase(shop.ctx, id, body)]);
    await receivePurchase(shop.ctx, id, body);
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.mainId)).toBe(3);
  });

  it("IMEI-tracked units become in-stock devices with supplier, cost and stock count", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const id = await ordered(shop, s, [{ variantId: s.phone.variantId, quantity: 2, unitCost: "90000" }]);
    await expect(receivePurchase(shop.ctx, id, lines({ variantId: s.phone.variantId, quantity: 2, imeis: [{ imei1: I1, imei2: "" }] }))).rejects.toMatchObject({ code: "IMEI_COUNT" });
    await receivePurchase(shop.ctx, id, lines({ variantId: s.phone.variantId, quantity: 2, imeis: [{ imei1: I1, imei2: "" }, { imei1: I2, imei2: "" }] }));
    expect(await qty(shop.ctx, s.phone.variantId, shop.mainId)).toBe(2);
    const devices = await adminDb().collection(`tenants/${shop.tenantId}/imeiRecords`).get();
    expect(devices.size).toBe(2);
    expect(devices.docs[0].data()).toMatchObject({ status: "IN_STOCK", supplierId: s.supplierId, purchaseId: id, purchasePrice: 9000000, branchId: shop.mainId });
  });

  it("refuses an IMEI that already exists and leaves everything unchanged", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await registerImei(shop.ctx, { variantId: s.phone.variantId, branchId: shop.mainId, imei1: I1, imei2: "", serialNumber: "", condition: "NEW", purchasePrice: "", notes: "" });
    const id = await ordered(shop, s, [{ variantId: s.phone.variantId, quantity: 1, unitCost: "90000" }]);
    await expect(receivePurchase(shop.ctx, id, lines({ variantId: s.phone.variantId, quantity: 1, imeis: [{ imei1: I1, imei2: "" }] }))).rejects.toMatchObject({ code: "IMEI_EXISTS" });
    expect((await getPurchase(shop.ctx, id)).items[0].receivedQty).toBe(0);
    expect(await qty(shop.ctx, s.phone.variantId, shop.mainId)).toBe(1); // only the manually registered device
  });
});

describe("IMEI devices and stock", () => {
  it("registering, damaging and moving a device keep the counter in step", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id } = await registerImei(shop.ctx, { variantId: s.phone.variantId, branchId: shop.mainId, imei1: I1, imei2: "", serialNumber: "", condition: "NEW", purchasePrice: "", notes: "" });
    expect(await qty(shop.ctx, s.phone.variantId, shop.mainId)).toBe(1);
    const upd = (o) => ({ status: "IN_STOCK", condition: "NEW", branchId: shop.mainId, serialNumber: "", notes: "", ...o });
    await updateImei(shop.ctx, id, upd({ status: "DAMAGED" }));
    expect(await qty(shop.ctx, s.phone.variantId, shop.mainId)).toBe(0);
    await updateImei(shop.ctx, id, upd({ status: "IN_STOCK", branchId: shop.otherId }));
    expect(await qty(shop.ctx, s.phone.variantId, shop.mainId)).toBe(0);
    expect(await qty(shop.ctx, s.phone.variantId, shop.otherId)).toBe(1);
  });
  it("recount repairs counters from the devices", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await registerImei(shop.ctx, { variantId: s.phone.variantId, branchId: shop.mainId, imei1: I1, imei2: "", serialNumber: "", condition: "NEW", purchasePrice: "", notes: "" });
    await adminDb().doc(`tenants/${shop.tenantId}/inventory/${s.phone.variantId}_${shop.mainId}`).update({ quantity: 42 });
    expect((await recountImeiInventory(shop.ctx)).changed).toBe(1);
    expect(await qty(shop.ctx, s.phone.variantId, shop.mainId)).toBe(1);
    expect((await recountImeiInventory(shop.ctx)).changed).toBe(0);
    await expect(recountImeiInventory(shop.scopedMain)).rejects.toMatchObject({ status: 403 });
  });
});

describe("adjustments", () => {
  it("adjusts plain stock, blocks negative results and IMEI-tracked products", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const base = { variantId: s.caseItem.variantId, branchId: shop.mainId, reason: "COUNT_CORRECTION", note: "" };
    await adjustStock(shop.ctx, { ...base, delta: 8 });
    await adjustStock(shop.ctx, { ...base, delta: -3, reason: "DAMAGE" });
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.mainId)).toBe(5);
    await expect(adjustStock(shop.ctx, { ...base, delta: -6 })).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", status: 409 });
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.mainId)).toBe(5);
    await expect(adjustStock(shop.ctx, { ...base, variantId: s.phone.variantId, delta: 1 })).rejects.toMatchObject({ code: "USE_IMEI_STATUS" });
  });
  it("two simultaneous removals of the same stock: only what exists can leave", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const base = { variantId: s.caseItem.variantId, branchId: shop.mainId, reason: "LOSS", note: "" };
    await adjustStock(shop.ctx, { ...base, delta: 5, reason: "FOUND" });
    const results = await Promise.allSettled([adjustStock(shop.ctx, { ...base, delta: -4 }), adjustStock(shop.ctx, { ...base, delta: -4 })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.mainId)).toBe(1);
  });
});

describe("branch transfers", () => {
  const send = (shop, items) => ({ fromBranchId: shop.mainId, toBranchId: shop.otherId, note: "", items });

  it("moves plain stock: out on send, in on receive", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await adjustStock(shop.ctx, { variantId: s.caseItem.variantId, branchId: shop.mainId, delta: 10, reason: "FOUND", note: "" });
    const { id } = await createTransfer(shop.ctx, send(shop, [{ variantId: s.caseItem.variantId, quantity: 4, imeis: [] }]));
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.mainId)).toBe(6);
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.otherId)).toBe(0);
    await changeTransfer(shop.ctx, id, "RECEIVE");
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.otherId)).toBe(4);
    await expect(changeTransfer(shop.ctx, id, "RECEIVE")).rejects.toMatchObject({ code: "INVALID_STATE" });
    await expect(changeTransfer(shop.ctx, id, "CANCEL")).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("cancelling returns the stock to the source", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await adjustStock(shop.ctx, { variantId: s.caseItem.variantId, branchId: shop.mainId, delta: 5, reason: "FOUND", note: "" });
    const { id } = await createTransfer(shop.ctx, send(shop, [{ variantId: s.caseItem.variantId, quantity: 5, imeis: [] }]));
    await changeTransfer(shop.ctx, id, "CANCEL");
    expect(await qty(shop.ctx, s.caseItem.variantId, shop.mainId)).toBe(5);
  });

  it("cannot send more than is in stock, or to the same branch", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await expect(createTransfer(shop.ctx, send(shop, [{ variantId: s.caseItem.variantId, quantity: 1, imeis: [] }]))).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    await expect(createTransfer(shop.ctx, { ...send(shop, [{ variantId: s.caseItem.variantId, quantity: 1, imeis: [] }]), toBranchId: shop.mainId })).rejects.toMatchObject({ code: "SAME_BRANCH" });
  });

  it("moves IMEI devices: in transit, then in stock at the destination", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id: deviceId } = await registerImei(shop.ctx, { variantId: s.phone.variantId, branchId: shop.mainId, imei1: I1, imei2: "", serialNumber: "", condition: "NEW", purchasePrice: "", notes: "" });
    const { id } = await createTransfer(shop.ctx, send(shop, [{ variantId: s.phone.variantId, quantity: 1, imeis: [I1] }]));
    expect((await getImeiRecord(shop.ctx, deviceId)).status).toBe("IN_TRANSIT");
    expect(await qty(shop.ctx, s.phone.variantId, shop.mainId)).toBe(0);
    await expect(updateImei(shop.ctx, deviceId, { status: "IN_STOCK", condition: "NEW", branchId: shop.mainId, serialNumber: "", notes: "" })).rejects.toMatchObject({ code: "IMEI_LOCKED" });
    await changeTransfer(shop.ctx, id, "RECEIVE");
    expect(await getImeiRecord(shop.ctx, deviceId)).toMatchObject({ status: "IN_STOCK", branchId: shop.otherId });
    expect(await qty(shop.ctx, s.phone.variantId, shop.otherId)).toBe(1);
  });

  it("a device can only be on one transfer, and must be in stock at the source", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await registerImei(shop.ctx, { variantId: s.phone.variantId, branchId: shop.mainId, imei1: I1, imei2: "", serialNumber: "", condition: "NEW", purchasePrice: "", notes: "" });
    const item = [{ variantId: s.phone.variantId, quantity: 1, imeis: [I1] }];
    const results = await Promise.allSettled([createTransfer(shop.ctx, send(shop, item)), createTransfer(shop.ctx, send(shop, item))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(createTransfer(shop.ctx, send(shop, [{ variantId: s.phone.variantId, quantity: 1, imeis: [I2] }]))).rejects.toMatchObject({ code: "IMEI_NOT_FOUND" });
  });

  it("branch scope: only the destination can receive, only the source can cancel", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await adjustStock(shop.ctx, { variantId: s.caseItem.variantId, branchId: shop.mainId, delta: 5, reason: "FOUND", note: "" });
    const { id } = await createTransfer(shop.ctx, send(shop, [{ variantId: s.caseItem.variantId, quantity: 2, imeis: [] }]));
    await expect(changeTransfer(shop.scopedMain, id, "RECEIVE")).rejects.toMatchObject({ status: 403 }); // main is the source
    const otherOnly = { ...shop.scopedMain, branchIds: [shop.otherId] };
    await expect(changeTransfer(otherOnly, id, "CANCEL")).rejects.toMatchObject({ status: 403 });
    const stranger = { ...shop.scopedMain, branchIds: ["somewhere-else"] };
    await expect(changeTransfer(stranger, id, "RECEIVE")).rejects.toMatchObject({ status: 404 });
    expect(await listTransfers(stranger)).toHaveLength(0);
    expect(await listTransfers(otherOnly)).toHaveLength(1);
  });
});

describe("branch isolation and tenant isolation", () => {
  it("a scoped member sees only her branch's purchases, stock and movements", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await adjustStock(shop.ctx, { variantId: s.caseItem.variantId, branchId: shop.otherId, delta: 7, reason: "FOUND", note: "" });
    const { id } = await createPurchase(shop.ctx, { ...po(shop, s, [{ variantId: s.caseItem.variantId, quantity: 1, unitCost: "1" }]), branchId: shop.otherId });
    expect(await listPurchases(shop.scopedMain)).toHaveLength(0);
    expect(await getPurchase(shop.scopedMain, id)).toBeNull();
    expect(await listInventory(shop.scopedMain)).toHaveLength(0);
    await expect(adjustStock(shop.scopedMain, { variantId: s.caseItem.variantId, branchId: shop.otherId, delta: 1, reason: "FOUND", note: "" })).rejects.toMatchObject({ status: 403 });
    await expect(createPurchase(shop.scopedMain, { ...po(shop, s, [{ variantId: s.caseItem.variantId, quantity: 1, unitCost: "1" }]), branchId: shop.otherId })).rejects.toMatchObject({ status: 403 });
    expect((await listInventory(shop.ctx)).length).toBe(1);
  });

  it("another shop never sees or touches this shop's records", async () => {
    const a = await makeShop("owner-a", "shop-a");
    const b = await makeShop("owner-b", "shop-b");
    const sa = await seed(a);
    const { id } = await createPurchase(a.ctx, po(a, sa, [{ variantId: sa.caseItem.variantId, quantity: 1, unitCost: "1" }]));
    expect(await getPurchase(b.ctx, id)).toBeNull();
    expect(await listPurchases(b.ctx)).toHaveLength(0);
    await expect(changePurchaseStatus(b.ctx, id, "ORDER")).rejects.toMatchObject({ status: 404 });
  });
});

describe("low stock and movements", () => {
  it("flags variants at or below minimum", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    expect((await getLowStock(shop.ctx)).map((v) => v.productName).sort()).toEqual(["Case Y", "Phone X"]);
    await adjustStock(shop.ctx, { variantId: s.caseItem.variantId, branchId: shop.mainId, delta: 6, reason: "FOUND", note: "" });
    expect((await getLowStock(shop.ctx)).map((v) => v.productName)).toEqual(["Phone X"]);
  });
  it("pages movements without duplicates or gaps", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    for (let i = 0; i < 5; i += 1) await adjustStock(shop.ctx, { variantId: s.caseItem.variantId, branchId: shop.mainId, delta: 1, reason: "FOUND", note: "" });
    const total = (await adminDb().collection(`tenants/${shop.tenantId}/stockMovements`).get()).size;
    const seen = [];
    let cursor;
    let pages = 0;
    do {
      const page = await listMovements(shop.ctx, { limit: 2, cursor });
      seen.push(...page.entries.map((e) => e.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 20);
    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total);
  });
});
