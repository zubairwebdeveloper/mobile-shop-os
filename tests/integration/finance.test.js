/**
 * Integration tests for Phase 10 services (installments, collections, expenses, payables, reports) against the Firebase EMULATORS.
 * Run with:  npm run test:integration   (NOT run by the author: no emulator was available when this was written)
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { brands, categories, createProduct, createVariant } from "@/lib/catalog/catalog";
import { registerImei } from "@/lib/catalog/imei";
import { createCustomer } from "@/lib/customers/customers";
import { collectPayment, getPayment } from "@/lib/finance/collections";
import { createExpense, voidExpense } from "@/lib/finance/expenses";
import { createPlan, getPlan } from "@/lib/finance/installments";
import { listPayables, paySupplier } from "@/lib/finance/payables";
import { createReconciliation, financeReport } from "@/lib/finance/reports";
import { closeDay } from "@/lib/sales/closing";
import { createReturn } from "@/lib/sales/returns";
import { createSale, getSale } from "@/lib/sales/sales";
import { dayKey } from "@/lib/sales/pure";
import { listBranches } from "@/lib/tenant/branches";
import { approveApplication, submitApplication } from "@/lib/tenant/onboarding";

const PROJECT = process.env.FIREBASE_ADMIN_PROJECT_ID || "demo-msos";
const ADMIN = "platform-admin";
const IMEIS = ["490154203237518", "356938035643809", "352099001761481"];
let keyCounter = 0;
const key = () => `k${Date.now().toString(16)}${(keyCounter += 1).toString(16).padStart(6, "0")}aaaa`;
const TODAY = () => dayKey(new Date(), "Asia/Karachi");
const R = (n) => n * 100;

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
  for (const imei of IMEIS) {
    await registerImei(ctx, { variantId: phone.variantId, branchId: shop.mainId, imei1: imei, imei2: "", serialNumber: "", condition: "NEW", purchasePrice: "800", notes: "" });
  }
  return { phone, screen };
}

const sellPhone = (shop, s, customer, paid, imei) => createSale(shop.ctx, {
  saleKey: key(), branchId: shop.mainId, customerId: customer?.id, customerName: customer ? "Ali Khan" : "", customerPhone: customer ? "0300 1234567" : "",
  note: "", taxPercent: "0", orderDiscount: "0",
  items: [{ variantId: s.phone.variantId, quantity: 1, discount: "0", imeis: [imei] }],
  payments: paid > 0 ? [{ method: "CASH", amount: String(paid), reference: "" }] : [],
});
const newCustomer = (shop) => createCustomer(shop.ctx, { name: "Ali Khan", phone: "0300 1234567", email: "", city: "Lahore", address: "", notes: "", vip: false, marketingConsent: false });
const collect = (shop, saleId, amount, o = {}) => collectPayment(shop.ctx, { paymentKey: key(), targetType: "SALE", targetId: saleId, amount: String(amount), method: "CASH", reference: "", ...o });

describe("installments and collections", () => {
  it("a credit sale becomes a plan; collections fill the earliest installment and finish the plan", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const c = await newCustomer(shop);
    const sale = await sellPhone(shop, s, c, 400, IMEIS[0]);
    expect((await getSale(shop.ctx, sale.id)).dueAmount).toBe(R(600));

    await createPlan(shop.ctx, { saleId: sale.id, count: 3, firstDueDate: TODAY(), frequency: "MONTHLY" });
    await expect(createPlan(shop.ctx, { saleId: sale.id, count: 3, firstDueDate: TODAY(), frequency: "MONTHLY" })).rejects.toMatchObject({ code: "PLAN_EXISTS" });
    let plan = await getPlan(shop.ctx, sale.id);
    expect(plan.schedule.map((r) => r.amount)).toEqual([R(200), R(200), R(200)]);

    const k = key();
    const first = await collect(shop, sale.id, 250, { paymentKey: k });
    const again = await collect(shop, sale.id, 250, { paymentKey: k });
    expect(again).toMatchObject({ id: first.id, duplicate: true });
    expect((await getSale(shop.ctx, sale.id)).dueAmount).toBe(R(350));
    plan = await getPlan(shop.ctx, sale.id);
    expect(plan.schedule.map((r) => r.outstanding)).toEqual([0, R(150), R(200)]);
    expect((await getPayment(shop.ctx, first.id)).allocations).toEqual([{ no: 1, amount: R(200) }, { no: 2, amount: R(50) }]);

    await expect(collect(shop, sale.id, 351)).rejects.toMatchObject({ code: "OVERPAYMENT" });
    await collect(shop, sale.id, 350);
    const done = await getSale(shop.ctx, sale.id);
    expect(done).toMatchObject({ dueAmount: 0, paymentStatus: "PAID", paidAmount: R(1000) });
    expect((await getPlan(shop.ctx, sale.id)).state).toBe("COMPLETED");
    await expect(collect(shop, sale.id, 1)).rejects.toMatchObject({ code: "OVERPAYMENT" });
  });

  it("a plan needs a saved customer and a balance", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const c = await newCustomer(shop);
    const paid = await sellPhone(shop, s, null, 1000, IMEIS[0]);
    await expect(createPlan(shop.ctx, { saleId: paid.id, count: 2, firstDueDate: TODAY(), frequency: "WEEKLY" })).rejects.toMatchObject({ code: "CUSTOMER_REQUIRED" });
    const full = await sellPhone(shop, s, c, 1000, IMEIS[1]);
    await expect(createPlan(shop.ctx, { saleId: full.id, count: 2, firstDueDate: TODAY(), frequency: "WEEKLY" })).rejects.toMatchObject({ code: "NOTHING_DUE" });
    const credit = await sellPhone(shop, s, c, 0, IMEIS[2]);
    await expect(createPlan(shop.ctx, { saleId: credit.id, count: 2, firstDueDate: "2020-01-01", frequency: "WEEKLY" })).rejects.toMatchObject({ code: "DATE_IN_PAST" });
  });

  it("a return that cancels part of the debt shrinks the last installments", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const c = await newCustomer(shop);
    const sale = await sellPhone(shop, s, c, 400, IMEIS[0]);
    await createPlan(shop.ctx, { saleId: sale.id, count: 3, firstDueDate: TODAY(), frequency: "MONTHLY" });
    await createReturn(shop.ctx, { returnKey: key(), saleId: sale.id, reason: "DEFECTIVE", note: "", refundMethod: "CASH", reference: "", items: [{ variantId: s.phone.variantId, quantity: 1, restock: true, imeis: [IMEIS[0]] }] });
    const plan = await getPlan(shop.ctx, sale.id);
    expect(plan.outstanding).toBe(0);
    expect(plan.state).toBe("COMPLETED");
  });

  it("another branch's scoped member cannot collect on this sale", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const c = await newCustomer(shop);
    const sale = await sellPhone(shop, s, c, 400, IMEIS[0]);
    const outsider = { ...shop.scopedMain, branchIds: [shop.otherId] };
    await expect(collectPayment(outsider, { paymentKey: key(), targetType: "SALE", targetId: sale.id, amount: "100", method: "CASH", reference: "" })).rejects.toBeTruthy();
    expect((await getSale(shop.ctx, sale.id)).dueAmount).toBe(R(600));
  });
});

describe("expenses", () => {
  it("are created, voided once, and a branch outsider is refused", async () => {
    const shop = await makeShop();
    const input = { branchId: shop.mainId, category: "RENT", amount: "25000", date: TODAY(), method: "CASH", paidTo: "Landlord", note: "" };
    const { id } = await createExpense(shop.ctx, input);
    await expect(createExpense({ ...shop.scopedMain, branchIds: [shop.otherId] }, input)).rejects.toBeTruthy();
    await voidExpense(shop.ctx, id, { reason: "typo" });
    await expect(voidExpense(shop.ctx, id, { reason: "again" })).rejects.toMatchObject({ code: "ALREADY_VOID" });
  });
});

describe("supplier payables", () => {
  it("count received goods only, refuse overpayment, and shrink when paid", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const ref = adminDb().collection(`tenants/${shop.tenantId}/purchases`).doc();
    await ref.set({ number: "PO-000001", supplierId: "sup1", supplierName: "Sup", branchId: shop.mainId, status: "PARTIALLY_RECEIVED", createdAt: new Date(),
      items: [{ variantId: s.phone.variantId, quantity: 5, unitCost: R(800), receivedQty: 2 }, { variantId: s.screen.variantId, quantity: 5, unitCost: R(200), receivedQty: 0 }] });
    expect((await listPayables(shop.ctx)).total).toBe(R(1600));
    await expect(paySupplier(shop.ctx, { paymentKey: key(), purchaseId: ref.id, amount: "1601", method: "BANK_TRANSFER", reference: "" })).rejects.toMatchObject({ code: "OVERPAYMENT" });
    await paySupplier(shop.ctx, { paymentKey: key(), purchaseId: ref.id, amount: "600", method: "BANK_TRANSFER", reference: "TT1" });
    expect((await listPayables(shop.ctx)).total).toBe(R(1000));
  });
});

describe("report and closing", () => {
  it("keeps revenue, gross profit and net profit apart, and the day's cash expects the cash expense", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    await sellPhone(shop, s, null, 1000, IMEIS[0]); // price 1000, cost 800
    await createExpense(shop.ctx, { branchId: shop.mainId, category: "UTILITIES", amount: "50", date: TODAY(), method: "CASH", paidTo: "", note: "" });
    const rep = await financeReport(shop.ctx, { from: TODAY(), to: TODAY() });
    expect(rep.revenue.netSales).toBe(R(1000));
    expect(rep.costs.cogs).toBe(R(800));
    expect(rep.grossProfit).toBe(R(200));
    expect(rep.expenses.total).toBe(R(50));
    expect(rep.netProfit).toBe(R(150));
    expect(rep.cash.netByMethod.CASH).toBe(R(950));

    const rec = await createReconciliation(shop.ctx, { method: "CASH", from: TODAY(), to: TODAY(), statementTotal: "940", note: "" });
    expect(rec).toMatchObject({ systemNet: R(950), difference: -R(10) });

    const closed = await closeDay(shop.ctx, { branchId: shop.mainId, date: TODAY(), openingCash: "100", countedCash: "1050", note: "" });
    expect(closed.expectedCash).toBe(R(100 + 1000 - 50));
    expect(closed.difference).toBe(0);
  });

  it("a restocked return takes its cost back out of cost of goods", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const sale = await sellPhone(shop, s, null, 1000, IMEIS[0]);
    await createReturn(shop.ctx, { returnKey: key(), saleId: sale.id, reason: "DEFECTIVE", note: "", refundMethod: "CASH", reference: "", items: [{ variantId: s.phone.variantId, quantity: 1, restock: true, imeis: [IMEIS[0]] }] });
    const rep = await financeReport(shop.ctx, { from: TODAY(), to: TODAY() });
    expect(rep.revenue.netSales).toBe(0);
    expect(rep.costs.cogs).toBe(0);
    expect(rep.grossProfit).toBe(0);
  });
});
