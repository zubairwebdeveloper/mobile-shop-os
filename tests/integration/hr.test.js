/**
 * Integration tests for Phase 11 services (staff, attendance, leave, performance, commission) against the Firebase EMULATORS.
 * Run with:  npm run test:integration   (NOT run by the author: no emulator was available when this was written)
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { brands, categories, createProduct, createVariant } from "@/lib/catalog/catalog";
import { registerImei } from "@/lib/catalog/imei";
import { commissionMonth, finalizeCommission, markCommissionPaid } from "@/lib/hr/commissions";
import { daySheet, employeeMonth, markAttendance } from "@/lib/hr/attendance";
import { createEmployee, getEmployee, listEmployees, updateEmployee } from "@/lib/hr/employees";
import { decideLeave, listLeaves, requestLeave } from "@/lib/hr/leave";
import { branchAnalytics, employeeActivity, employeePerformance } from "@/lib/hr/performance";
import { monthRange } from "@/lib/hr/pure";
import { createReturn } from "@/lib/sales/returns";
import { createSale } from "@/lib/sales/sales";
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

const emp = (shop, o = {}) => ({ name: "Bilal", phone: "", designation: "Salesman", branchId: shop.mainId, memberUid: "owner", joinDate: "2026-01-01", commissionPercent: "2.5", monthlyTarget: "100000", status: "ACTIVE", note: "", ...o });
const sellPhone = (shop, s, imei) => createSale(shop.ctx, {
  saleKey: key(), branchId: shop.mainId, customerName: "", customerPhone: "", note: "", taxPercent: "0", orderDiscount: "0",
  items: [{ variantId: s.phone.variantId, quantity: 1, discount: "0", imeis: [imei] }], payments: [{ method: "CASH", amount: "1000", reference: "" }],
});

describe("employees", () => {
  it("one team account links to one employee; the link moves when changed", async () => {
    const shop = await makeShop();
    const a = await createEmployee(shop.ctx, emp(shop));
    await expect(createEmployee(shop.ctx, emp(shop, { name: "Other" }))).rejects.toMatchObject({ code: "MEMBER_ALREADY_LINKED" });
    const b = await createEmployee(shop.ctx, emp(shop, { name: "Second", memberUid: undefined }));
    await expect(updateEmployee(shop.ctx, b.id, { ...emp(shop, { name: "Second" }) })).rejects.toMatchObject({ code: "MEMBER_ALREADY_LINKED" });
    await updateEmployee(shop.ctx, a.id, { ...emp(shop), memberUid: undefined });
    await updateEmployee(shop.ctx, b.id, { ...emp(shop, { name: "Second" }) });
    expect((await getEmployee(shop.ctx, b.id)).memberUid).toBe("owner");
    expect((await listEmployees(shop.ctx)).map((e) => e.name)).toEqual(["Bilal", "Second"]);
  });

  it("branch scope: a member of another branch cannot add or see staff here", async () => {
    const shop = await makeShop();
    const outsider = { ...shop.scopedMain, branchIds: [shop.otherId] };
    await expect(createEmployee(outsider, emp(shop, { memberUid: undefined }))).rejects.toBeTruthy();
    const { id } = await createEmployee(shop.ctx, emp(shop, { memberUid: undefined }));
    expect(await getEmployee(outsider, id)).toBeNull();
    expect(await listEmployees(outsider)).toEqual([]);
  });
});

describe("attendance and leave", () => {
  it("marks a day, corrects it, and refuses future days and days before joining", async () => {
    const shop = await makeShop();
    const { id } = await createEmployee(shop.ctx, emp(shop, { memberUid: undefined, joinDate: TODAY() }));
    const day = TODAY();
    await markAttendance(shop.ctx, { branchId: shop.mainId, date: day, entries: [{ employeeId: id, status: "LATE", note: "" }] });
    await markAttendance(shop.ctx, { branchId: shop.mainId, date: day, entries: [{ employeeId: id, status: "PRESENT", note: "" }] });
    expect((await daySheet(shop.ctx, { branchId: shop.mainId, date: day }))[0]).toMatchObject({ status: "PRESENT" });
    await expect(markAttendance(shop.ctx, { branchId: shop.mainId, date: "2000-01-01", entries: [{ employeeId: id, status: "PRESENT", note: "" }] })).rejects.toMatchObject({ code: "BEFORE_JOIN_DATE" });
    await expect(markAttendance(shop.ctx, { branchId: shop.mainId, date: "2099-01-01", entries: [{ employeeId: id, status: "PRESENT", note: "" }] })).rejects.toMatchObject({ code: "FUTURE_DATE" });
    const m = await employeeMonth(shop.ctx, await getEmployee(shop.ctx, id), TODAY().slice(0, 7));
    expect(m.summary.PRESENT).toBe(1);
    expect(m.summary.LATE).toBe(0);
  });

  it("leave: overlap refused, approve then cancel, invalid transitions refused; approved leave shows in the sheet", async () => {
    const shop = await makeShop();
    const { id } = await createEmployee(shop.ctx, emp(shop, { memberUid: undefined, joinDate: "2026-01-01" }));
    const input = { employeeId: id, type: "SICK", from: TODAY(), to: TODAY(), reason: "" };
    const l = await requestLeave(shop.ctx, input);
    await expect(requestLeave(shop.ctx, input)).rejects.toMatchObject({ code: "LEAVE_OVERLAP" });
    await decideLeave(shop.ctx, l.id, { decision: "APPROVED", note: "" });
    await expect(decideLeave(shop.ctx, l.id, { decision: "REJECTED", note: "" })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect((await daySheet(shop.ctx, { branchId: shop.mainId, date: TODAY() }))[0].onApprovedLeave).toBe(true);
    await decideLeave(shop.ctx, l.id, { decision: "CANCELLED", note: "" });
    expect((await listLeaves(shop.ctx, { status: "CANCELLED" })).length).toBe(1);
    await requestLeave(shop.ctx, input); // free again after cancelling
  });
});

describe("performance and commission", () => {
  it("credits sales to the linked account, net of returns, and reports unlinked sellers apart", async () => {
    const shop = await makeShop();
    const s = await seed(shop);
    const { id } = await createEmployee(shop.ctx, emp(shop));
    const sale = await sellPhone(shop, s, IMEIS[0]);
    await sellPhone(shop, s, IMEIS[1]);
    const unlinkedCtx = { ...shop.ctx, user: { uid: "someone-else" } };
    await createSale(unlinkedCtx, {
      saleKey: key(), branchId: shop.mainId, customerName: "", customerPhone: "", note: "", taxPercent: "0", orderDiscount: "0",
      items: [{ variantId: s.phone.variantId, quantity: 1, discount: "0", imeis: [IMEIS[2]] }], payments: [{ method: "CASH", amount: "1000", reference: "" }],
    });
    const { from, to } = monthRange(TODAY().slice(0, 7));
    let perf = await employeePerformance(shop.ctx, { from, to });
    expect(perf.rows.find((r) => r.employeeId === id)).toMatchObject({ salesCount: 2, netSales: R(2000), targetPercent: 2, commissionPreview: R(50) });
    expect(perf.unlinked).toMatchObject({ salesCount: 1, netSales: R(1000) });
    await createReturn(shop.ctx, { returnKey: key(), saleId: sale.id, reason: "DEFECTIVE", note: "", refundMethod: "CASH", reference: "", items: [{ variantId: s.phone.variantId, quantity: 1, restock: true, imeis: [IMEIS[0]] }] });
    perf = await employeePerformance(shop.ctx, { from, to });
    expect(perf.rows.find((r) => r.employeeId === id).netSales).toBe(R(1000));
    const branch = await branchAnalytics(shop.ctx, { from, to });
    expect(branch.rows[0]).toMatchObject({ branchId: shop.mainId, salesCount: 3, returnsCount: 1 });
    expect((await employeeActivity(shop.ctx, await getEmployee(shop.ctx, id))).some((a) => a.action === "SALE_CREATED")).toBe(true);
  });

  it("commission is finalised once, only for an ended month, from the server's own sales", async () => {
    const shop = await makeShop();
    const { id } = await createEmployee(shop.ctx, emp(shop));
    await adminDb().collection(`tenants/${shop.tenantId}/sales`).doc("old1").set({
      branchId: shop.mainId, createdBy: "owner", createdAt: new Date("2026-09-15T08:00:00Z"), total: R(1000), taxAmount: 0,
      items: [{ lineTotal: R(1000), taxShare: 0, refundedAmount: 0 }],
    });
    await expect(finalizeCommission(shop.ctx, { employeeId: id, month: TODAY().slice(0, 7) })).rejects.toMatchObject({ code: "MONTH_NOT_ENDED" });
    const done = await finalizeCommission(shop.ctx, { employeeId: id, month: "2026-09" });
    expect(done).toMatchObject({ amount: R(25), netSales: R(1000) });
    await expect(finalizeCommission(shop.ctx, { employeeId: id, month: "2026-09" })).rejects.toMatchObject({ code: "ALREADY_FINALIZED" });
    const view = await commissionMonth(shop.ctx, { month: "2026-09" });
    expect(view.rows.find((r) => r.employeeId === id).record).toMatchObject({ status: "APPROVED", amount: R(25), rateBps: 250 });
    await markCommissionPaid(shop.ctx, { employeeId: id, month: "2026-09" });
    await expect(markCommissionPaid(shop.ctx, { employeeId: id, month: "2026-09" })).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("an unlinked employee cannot have commission finalised", async () => {
    const shop = await makeShop();
    const { id } = await createEmployee(shop.ctx, emp(shop, { memberUid: undefined }));
    await expect(finalizeCommission(shop.ctx, { employeeId: id, month: "2026-09" })).rejects.toMatchObject({ code: "NOT_LINKED" });
  });
});
