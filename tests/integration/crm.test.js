/**
 * Integration tests for Phase 9 services (customers, warranty, repairs) against the Firebase EMULATORS.
 * Run with:  npm run test:integration
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { brands, categories, createProduct, createVariant } from "@/lib/catalog/catalog";
import { registerImei } from "@/lib/catalog/imei";
import { createCustomer, getCustomer, searchCustomers, updateCustomer } from "@/lib/customers/customers";
import { addMonths } from "@/lib/customers/pure";
import { adjustStock } from "@/lib/inventory/adjust";
import { changeRepair, createRepair, getRepair, listRepairs } from "@/lib/repairs/repairs";
import { createReturn } from "@/lib/sales/returns";
import { createSale, getSale } from "@/lib/sales/sales";
import { dayKey } from "@/lib/sales/pure";
import { listBranches } from "@/lib/tenant/branches";
import { approveApplication, submitApplication } from "@/lib/tenant/onboarding";
import { changeWarranty, expiringWarranties, getWarranty, listWarranties, lookupWarranties, registerWarranties } from "@/lib/warranty/warranty";

const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID || "demo-msos";
const ADMIN = "platform-admin";
const I1 = "490154203237518";
const I2 = "356938035643809";
let keyCounter = 0;
const key = () => `k${Date.now().toString(16)}${(keyCounter += 1).toString(16).padStart(6, "0")}aaaa`;
const TODAY = () => dayKey(new Date(), "Asia/Karachi");

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
    shopName: `Shop ${slug}`, slug, ownerName: "Owner", phone: "+92 300 1234567", city: "Lahore", address: "Hall Road, Lahore", expectedBranches: 1,
  });
  const { tenantId } = await approveApplication(ADMIN, uid);
  const ctx = { tenantId, role: "OWNER", user: { uid }, allBranches: true, branchIds: [] };
  const mainId = (await listBranches(ctx))[0].id;
  const second = adminDb().collection(`tenants/${tenantId}/branches`).doc();
  await second.set({ name: "Branch B", active: true, createdAt: new Date() });
  const scopedMain = { ...ctx, role: "CASHIER", user: { uid: "cashier" }, allBranches: false, branchIds: [mainId] };
  return { ctx, tenantId, mainId, otherId: second.id, scopedMain };
}

async function seed(shop) {
  const { ctx } = shop;
  const { id: phones } = await categories.create(ctx, { name: "Phones", tracksImei: true, active: true });
  const { id: parts } = await categories.create(ctx, { name: "Parts", tracksImei: false, active: true });
  const { id: brandId } = await brands.create(ctx, { name: "Generic", active: true });
  const mk = async (name, categoryId, cost, price) => {
    const { id: productId } = await createProduct(ctx, { name, brandId, categoryId, description: "", specs: "", barcode: "", status: "ACTIVE" });
    const { id: variantId } = await createVariant(ctx, productId, { storage: "", ram: "", color: "", sku: "", barcode: "", purchasePrice: cost, sellingPrice: price, wholesalePrice: "", minStock: 0, status: "ACTIVE" });
    return { productId, variantId };
  };
  const phone = await mk("Phone X", phones, "800", "1000");
  const screen = await mk("Screen", parts, "200", "500");
  await adjustStock(ctx, { variantId: screen.variantId, branchId: shop.mainId, delta: 5, reason: "FOUND", note: "" });
  for (const imei of [I1, I2]) {
    await registerImei(ctx, { variantId: phone.variantId, branchId: shop.mainId, imei1: imei, imei2: "", serialNumber: "", condition: "NEW", purchasePrice: "800", notes: "" });
  }
  return { phone, screen };
}

const customerInput = (o = {}) => ({ name: "Ali Khan", phone: "0300 1234567", email: "", city: "Lahore", address: "", notes: "", vip: false, marketingConsent: false, ...o });
const qty = async (shop, variantId) => {
  const snap = await adminDb().doc(`tenants/${shop.tenantId}/inventory/${variantId}_${shop.mainId}`).get();
  return snap.exists ? snap.data().quantity : 0;
};
const cash = (amount) => [{ method: "CASH", amount: String(amount), reference: "" }];
const sellPhone = (shop, s, extra = {}) => createSale(shop.ctx, {
  saleKey: key(), branchId: shop.mainId, customerName: "", customerPhone: "", note: "", taxPercent: "0", orderDiscount: "0",
  items: [{ variantId: s.phone.variantId, quantity: 1, discount: "0", imeis: [I1] }], payments: cash(1000), ...extra,
});
const regWarranty = (saleId, s, o = {}) => ({ saleId, months: 12, startDate: TODAY(), terms: "Parts and labour", items: [{ variantId: s.phone.variantId, imeis: [I1] }], ...o });

describe("customers", () => {
  it("one customer per phone, whatever the format; search by phone and name", async () => {
    const shop = await makeShop();
    const { id } = await createCustomer(shop.ctx, customerInput());
    await expect(createCustomer(shop.ctx, customerInput({ name: "Other", phone: "+92 300 1234567" }))).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    expect((await searchCustomers(shop.ctx, { q: "3001234567" })).map((c) => c.id)).toEqual([id]);
    expect((await searchCustomers(shop.ctx, { q: "ali" })).map((c) => c.id)).toEqual([id]);
    expect(await searchCustomers(shop.ctx, { q: "zzz" })).toEqual([]);
  });

  it("changing the phone moves the claim; taking someone else's phone is refused", async () => {
    const shop = await makeShop();
    const a = await createCustomer(shop.ctx, customerInput());
    const b = await createCustomer(shop.ctx, customerInput({ name: "Bilal", phone: "0301 7654321" }));
    await expect(updateCustomer(shop.ctx, b.id, { ...customerInput({ name: "Bilal", phone: "0300 1234567" }), status: "ACTIVE" })).rejects.toMatchObject({ code: "PHONE_TAKEN" });
    await updateCustomer(shop.ctx, a.id, { ...customerInput({ phone: "0302 1111111" }), status: "ACTIVE" });
    await createCustomer(shop.ctx, customerInput({ name: "Newcomer", phone: "0300 1234567" })); // the old number is free again
  });

  it("private details and VIP are for owner/manager; a cashier cannot overwrite them", async () => {
    const shop = await makeShop();
    const { id } = await createCustomer(shop.ctx, customerInput({ email: "ali@example.test", notes: "pays late", vip: true }));
    expect((await getCustomer(shop.ctx, id)).private).toMatchObject({ email: "ali@example.test", notes: "pays late" });
    expect((await getCustomer(shop.scopedMain, id)).private).toBeNull();
    await updateCustomer(shop.scopedMain, id, { ...customerInput({ name: "Ali K", vip: false, email: "" }), status: "ARCHIVED" });
    const after = await getCustomer(shop.ctx, id);
    expect(after.customer).toMatchObject({ name: "Ali K", vip: true, status: "ACTIVE" });
    expect(after.private.email).toBe("ali@example.test");
    const byCashier = await createCustomer(shop.scopedMain, customerInput({ name: "Zed", phone: "0333 1111111", vip: true }));
    expect((await getCustomer(shop.ctx, byCashier.id)).customer.vip).toBe(false);
  });

  it("another shop never sees this shop's customers", async () => {
    const a = await makeShop("owner-a", "shop-a");
    const b = await makeShop("owner-b", "shop-b");
    const { id } = await createCustomer(a.ctx, customerInput());
    expect(await getCustomer(b.ctx, id)).toBeNull();
    expect(await searchCustomers(b.ctx, {})).toEqual([]);
    await createCustomer(b.ctx, customerInput()); // same phone is fine in another shop
  });
});

describe("sales linked to customers", () => {
  it("snapshots the customer, allows credit, and the profile shows balance, devices and value", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id: customerId } = await createCustomer(shop.ctx, customerInput());
    const { id } = await sellPhone(shop, s, { customerId, payments: cash(400) });
    expect(await getSale(shop.ctx, id)).toMatchObject({ customerId, customerName: "Ali Khan", paymentStatus: "PARTIAL", dueAmount: 60000 });
    const profile = await getCustomer(shop.ctx, customerId);
    expect(profile.stats).toMatchObject({ salesCount: 1, lifetimeValue: 100000, outstanding: 60000 });
    expect(profile.devices.map((d) => d.imei)).toEqual([I1]);
  });
  it("an archived or unknown customer cannot be used", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id } = await createCustomer(shop.ctx, customerInput());
    await updateCustomer(shop.ctx, id, { ...customerInput(), status: "ARCHIVED" });
    await expect(sellPhone(shop, s, { customerId: id })).rejects.toMatchObject({ status: 404 });
    await expect(sellPhone(shop, s, { customerId: "nobody" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("warranty", () => {
  it("registers per device, computes the end date and refuses duplicates (also concurrently)", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id: saleId } = await sellPhone(shop, s);
    const results = await Promise.allSettled([registerWarranties(shop.ctx, regWarranty(saleId, s)), registerWarranties(shop.ctx, regWarranty(saleId, s))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const [w] = (await listWarranties(shop.ctx)).entries;
    expect(w).toMatchObject({ number: "WAR-000001", imei1: I1, months: 12, state: "ACTIVE", expiryDate: addMonths(TODAY(), 12) });
    await expect(registerWarranties(shop.ctx, regWarranty(saleId, s))).rejects.toMatchObject({ code: "ALREADY_REGISTERED" });
  });

  it("refuses units not on the sale and returned devices", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id: saleId } = await sellPhone(shop, s);
    await expect(registerWarranties(shop.ctx, regWarranty(saleId, s, { items: [{ variantId: s.phone.variantId, imeis: [I2] }] }))).rejects.toMatchObject({ code: "IMEI_NOT_ON_SALE" });
    await expect(registerWarranties(shop.ctx, regWarranty(saleId, s, { items: [{ variantId: s.screen.variantId, imeis: [] }] }))).rejects.toMatchObject({ code: "NOT_ON_SALE" });
    await createReturn(shop.ctx, { returnKey: key(), saleId, reason: "OTHER", note: "", refundMethod: "CASH", reference: "", items: [{ variantId: s.phone.variantId, quantity: 1, restock: true, imeis: [I1] }] });
    await expect(registerWarranties(shop.ctx, regWarranty(saleId, s))).rejects.toMatchObject({ code: "IMEI_NOT_ON_SALE" });
  });

  it("claims: logged while active, decided by approvers, refused after expiry or void", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id: saleId } = await sellPhone(shop, s);
    const { ids } = await registerWarranties(shop.ctx, regWarranty(saleId, s));
    await changeWarranty(shop.ctx, ids[0], { action: "CLAIM_ADD", description: "Screen flickers" });
    const claim = (await getWarranty(shop.ctx, ids[0])).claims[0];
    expect(claim.status).toBe("OPEN");
    await changeWarranty(shop.ctx, ids[0], { action: "CLAIM_UPDATE", claimId: claim.id, status: "RESOLVED", resolution: "Replaced screen" });
    await expect(changeWarranty(shop.ctx, ids[0], { action: "CLAIM_UPDATE", claimId: claim.id, status: "REJECTED", resolution: "" })).rejects.toMatchObject({ code: "INVALID_STATE" });
    await changeWarranty(shop.ctx, ids[0], { action: "VOID", reason: "Water damage found" });
    await expect(changeWarranty(shop.ctx, ids[0], { action: "CLAIM_ADD", description: "Again" })).rejects.toMatchObject({ code: "WARRANTY_NOT_ACTIVE" });
    await expect(changeWarranty(shop.ctx, ids[0], { action: "VOID", reason: "twice" })).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("an expired warranty is shown as expired and takes no claims", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id: saleId } = await sellPhone(shop, s);
    const { ids } = await registerWarranties(shop.ctx, regWarranty(saleId, s, { months: 1, startDate: addMonths(TODAY(), -3) }));
    expect((await getWarranty(shop.ctx, ids[0])).state).toBe("EXPIRED");
    await expect(changeWarranty(shop.ctx, ids[0], { action: "CLAIM_ADD", description: "Too late" })).rejects.toMatchObject({ code: "WARRANTY_NOT_ACTIVE" });
  });

  it("lookup by IMEI or phone, and the ending-soon list", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id: customerId } = await createCustomer(shop.ctx, customerInput());
    const { id: saleId } = await sellPhone(shop, s, { customerId });
    await registerWarranties(shop.ctx, regWarranty(saleId, s, { months: 1 }));
    expect(await lookupWarranties(shop.ctx, I1)).toHaveLength(1);
    expect(await lookupWarranties(shop.ctx, "0300 1234567")).toHaveLength(1);
    expect(await lookupWarranties(shop.ctx, I2)).toHaveLength(0);
    expect(await lookupWarranties(shop.ctx, "garbage")).toHaveLength(0);
    expect(await expiringWarranties(shop.ctx, 60)).toHaveLength(1);
    expect(await expiringWarranties(shop.ctx, 7)).toHaveLength(0);
  });

  it("branch isolation: a scoped member cannot see or touch another branch's warranties", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await adjustStock(shop.ctx, { variantId: s.screen.variantId, branchId: shop.otherId, delta: 3, reason: "FOUND", note: "" });
    const { id: saleId } = await createSale(shop.ctx, {
      saleKey: key(), branchId: shop.otherId, customerName: "", customerPhone: "", note: "", taxPercent: "0", orderDiscount: "0",
      items: [{ variantId: s.screen.variantId, quantity: 1, discount: "0", imeis: [] }], payments: cash(500),
    });
    const { ids } = await registerWarranties(shop.ctx, { saleId, months: 6, startDate: TODAY(), terms: "", items: [{ variantId: s.screen.variantId, imeis: [] }] });
    expect(await getWarranty(shop.scopedMain, ids[0])).toBeNull();
    expect((await listWarranties(shop.scopedMain)).entries).toHaveLength(0);
    await expect(changeWarranty(shop.scopedMain, ids[0], { action: "CLAIM_ADD", description: "nope" })).rejects.toMatchObject({ status: 404 });
    await expect(registerWarranties(shop.scopedMain, { saleId, months: 6, startDate: TODAY(), terms: "", items: [{ variantId: s.screen.variantId, imeis: [] }] })).rejects.toMatchObject({ status: 404 });
  });
});

describe("repairs", () => {
  const job = (shop, o = {}) => ({ branchId: shop.mainId, customerName: "Walk In", customerPhone: "", deviceBrand: "Samsung", deviceModel: "A15", imei: "", issue: "Cracked screen", accessories: "", estimatedCost: "3000", ...o });

  it("numbers jobs and follows the status flow", async () => {
    const shop = await makeShop();
    const a = await createRepair(shop.ctx, job(shop));
    const b = await createRepair(shop.ctx, job(shop));
    expect((await getRepair(shop.ctx, a.id)).number).toBe("REP-000001");
    expect((await getRepair(shop.ctx, b.id)).number).toBe("REP-000002");
    await expect(changeRepair(shop.ctx, a.id, { action: "STATUS", status: "DELIVERED", note: "", collected: "0", method: "CASH" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await changeRepair(shop.ctx, a.id, { action: "STATUS", status: "DIAGNOSING", note: "Looking", collected: "0", method: "CASH" });
    const r = await getRepair(shop.ctx, a.id);
    expect(r.status).toBe("DIAGNOSING");
    expect(r.history.map((h) => h.status)).toEqual(["RECEIVED", "DIAGNOSING"]);
    expect((await listRepairs(shop.ctx, {})).entries).toHaveLength(2);
  });

  it("assigns only a real technician who works in the branch", async () => {
    const shop = await makeShop();
    const { id } = await createRepair(shop.ctx, job(shop));
    await adminDb().doc(`tenants/${shop.tenantId}/members/tech1`).set({ role: "TECHNICIAN", status: "ACTIVE", allBranches: true, branchIds: [], displayName: "Tariq" });
    await adminDb().doc(`tenants/${shop.tenantId}/members/cash1`).set({ role: "CASHIER", status: "ACTIVE", allBranches: true, branchIds: [], displayName: "Cathy" });
    await adminDb().doc(`tenants/${shop.tenantId}/members/tech2`).set({ role: "TECHNICIAN", status: "ACTIVE", allBranches: false, branchIds: [shop.otherId], displayName: "Other" });
    const update = (uid) => ({ action: "UPDATE", estimatedCost: "3000", labourCharge: "1000", diagnosis: "Screen", technicianUid: uid });
    await changeRepair(shop.ctx, id, update("tech1"));
    expect(await getRepair(shop.ctx, id)).toMatchObject({ technicianName: "Tariq", labourCharge: 100000, diagnosis: "Screen" });
    await expect(changeRepair(shop.ctx, id, update("cash1"))).rejects.toMatchObject({ code: "TECHNICIAN_UNAVAILABLE" });
    await expect(changeRepair(shop.ctx, id, update("tech2"))).rejects.toMatchObject({ code: "TECHNICIAN_UNAVAILABLE" });
    await expect(changeRepair(shop.ctx, id, update("nobody"))).rejects.toMatchObject({ code: "TECHNICIAN_UNAVAILABLE" });
  });

  it("parts leave stock, return when removed, and devices are refused as parts", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id } = await createRepair(shop.ctx, job(shop));
    const add = (variantId, quantity) => ({ action: "ADD_PART", variantId, quantity, unitPrice: "500" });
    await expect(changeRepair(shop.ctx, id, add(s.screen.variantId, 1))).rejects.toMatchObject({ code: "INVALID_STATE" }); // still RECEIVED
    await changeRepair(shop.ctx, id, { action: "STATUS", status: "DIAGNOSING", note: "", collected: "0", method: "CASH" });
    await changeRepair(shop.ctx, id, add(s.screen.variantId, 2));
    expect(await qty(shop, s.screen.variantId)).toBe(3);
    await expect(changeRepair(shop.ctx, id, add(s.screen.variantId, 4))).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    await expect(changeRepair(shop.ctx, id, add(s.phone.variantId, 1))).rejects.toMatchObject({ code: "PART_NOT_STOCKED" });
    const r = await getRepair(shop.ctx, id);
    expect(r).toMatchObject({ partsTotal: 100000 });
    await changeRepair(shop.ctx, id, { action: "REMOVE_PART", partId: r.parts[0].id });
    expect(await qty(shop, s.screen.variantId)).toBe(5);
  });

  it("cancelling returns the parts; finished jobs are frozen", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id } = await createRepair(shop.ctx, job(shop));
    const st = (status) => ({ action: "STATUS", status, note: "", collected: "0", method: "CASH" });
    await changeRepair(shop.ctx, id, st("DIAGNOSING"));
    await changeRepair(shop.ctx, id, { action: "ADD_PART", variantId: s.screen.variantId, quantity: 3, unitPrice: "500" });
    expect(await qty(shop, s.screen.variantId)).toBe(2);
    await changeRepair(shop.ctx, id, st("CANCELLED"));
    expect(await qty(shop, s.screen.variantId)).toBe(5);
    expect((await getRepair(shop.ctx, id)).parts).toEqual([]);
    await expect(changeRepair(shop.ctx, id, st("DIAGNOSING"))).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("delivery records the money: balance needs a customer, overpaying is refused", async () => {
    const shop = await makeShop();
    const { id: customerId } = await createCustomer(shop.ctx, customerInput());
    const walkIn = await createRepair(shop.ctx, job(shop));
    const linked = await createRepair(shop.ctx, job(shop, { customerId }));
    const toReady = async (id) => {
      for (const status of ["DIAGNOSING", "IN_PROGRESS", "READY"]) await changeRepair(shop.ctx, id, { action: "STATUS", status, note: "", collected: "0", method: "CASH" });
      await changeRepair(shop.ctx, id, { action: "UPDATE", estimatedCost: "3000", labourCharge: "3000", diagnosis: "", technicianUid: "" });
    };
    await toReady(walkIn.id);
    await toReady(linked.id);
    const deliver = (id, collected) => changeRepair(shop.ctx, id, { action: "STATUS", status: "DELIVERED", note: "", collected: String(collected), method: "JAZZCASH" });
    await expect(deliver(walkIn.id, 1000)).rejects.toMatchObject({ code: "CUSTOMER_REQUIRED" });
    await expect(deliver(walkIn.id, 9000)).rejects.toMatchObject({ code: "OVERPAYMENT" });
    await deliver(walkIn.id, 3000);
    await deliver(linked.id, 1000);
    expect(await getRepair(shop.ctx, linked.id)).toMatchObject({ status: "DELIVERED", finalCost: 300000, collected: 100000, dueAmount: 200000, collectionMethod: "JAZZCASH" });
    expect((await getCustomer(shop.ctx, customerId)).stats.outstanding).toBe(200000);
  });

  it("a warranty repair is free and needs an active warranty", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id: saleId } = await sellPhone(shop, s);
    const { ids } = await registerWarranties(shop.ctx, regWarranty(saleId, s));
    const { id } = await createRepair(shop.ctx, job(shop, { warrantyId: ids[0] }));
    for (const status of ["DIAGNOSING", "READY"]) await changeRepair(shop.ctx, id, { action: "STATUS", status, note: "", collected: "0", method: "CASH" });
    await changeRepair(shop.ctx, id, { action: "UPDATE", estimatedCost: "0", labourCharge: "2000", diagnosis: "", technicianUid: "" });
    await changeRepair(shop.ctx, id, { action: "STATUS", status: "DELIVERED", note: "", collected: "0", method: "CASH" });
    expect(await getRepair(shop.ctx, id)).toMatchObject({ underWarranty: true, finalCost: 0, collected: 0, dueAmount: 0 });
    await changeWarranty(shop.ctx, ids[0], { action: "VOID", reason: "Test void" });
    await expect(createRepair(shop.ctx, job(shop, { warrantyId: ids[0] }))).rejects.toMatchObject({ code: "WARRANTY_NOT_ACTIVE" });
  });

  it("branch and shop isolation", async () => {
    const a = await makeShop("owner-a", "shop-a");
    const b = await makeShop("owner-b", "shop-b");
    const { id } = await createRepair(a.ctx, job(a, { branchId: a.otherId }));
    expect(await getRepair(a.scopedMain, id)).toBeNull();
    expect((await listRepairs(a.scopedMain, {})).entries).toHaveLength(0);
    await expect(changeRepair(a.scopedMain, id, { action: "STATUS", status: "DIAGNOSING", note: "", collected: "0", method: "CASH" })).rejects.toMatchObject({ status: 404 });
    await expect(createRepair(a.scopedMain, job(a, { branchId: a.otherId }))).rejects.toMatchObject({ status: 403 });
    expect(await getRepair(b.ctx, id)).toBeNull();
    await expect(changeRepair(b.ctx, id, { action: "STATUS", status: "DIAGNOSING", note: "", collected: "0", method: "CASH" })).rejects.toMatchObject({ status: 404 });
  });
});
