import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { rupeesToPaisa } from "@/lib/catalog/pure";
import { assertBranch, col, docRef, iso } from "@/lib/inventory/common";
import { badRequest, conflict, notFound } from "@/lib/security/errors";
import { closingTotals, dayKey, dayRangeUtc } from "./pure";
import { pagedList } from "./sales";

/**
 * Daily closing and cash-drawer reconciliation, once per branch per local day (the shop's timezone).
 * expected cash = opening float + cash from sales + cash collected on balances + cash taken at repair hand-over
 * - cash refunds - cash expenses - cash supplier payments; difference = counted - expected.
 * It is a record, not a lock: sales made after closing are still allowed and are not in that day's totals.
 */

const MAX_DOCS = 2000;
const serialize = (d) => ({ id: d.id, ...d.data(), createdAt: iso(d.data().createdAt) });

export const listClosings = (ctx, opts) => pagedList(ctx, "dailyClosings", serialize, opts);

export async function closeDay(ctx, input) {
  assertBranch(ctx, input.branchId);
  const tenant = await adminDb().doc(`tenants/${ctx.tenantId}`).get();
  const timeZone = tenant.data()?.settings?.timezone ?? "Asia/Karachi";
  if (input.date > dayKey(new Date(), timeZone)) throw badRequest("You cannot close a day that has not started.");
  const branch = await docRef(ctx, "branches", input.branchId).get();
  if (!branch.exists) throw notFound("Branch not found.");

  const { start, end } = dayRangeUtc(input.date, timeZone);
  const window = (name) => col(ctx, name).where("branchId", "==", input.branchId).where("createdAt", ">=", start).where("createdAt", "<", end).limit(MAX_DOCS + 1);
  const [salesSnap, returnsSnap, paySnap, spaySnap, repairSnap, expenseSnap] = await Promise.all([
    window("sales").get(), window("returns").get(), window("payments").get(), window("supplierPayments").get(),
    col(ctx, "repairJobs").where("branchId", "==", input.branchId).where("deliveredAt", ">=", start).where("deliveredAt", "<", end).limit(MAX_DOCS + 1).get(),
    col(ctx, "expenses").where("branchId", "==", input.branchId).where("date", "==", input.date).limit(MAX_DOCS + 1).get(),
  ]);
  if ([salesSnap, returnsSnap, paySnap, spaySnap, repairSnap, expenseSnap].some((s) => s.size > MAX_DOCS)) throw conflict("TOO_MANY_RECORDS", "Too many records to close in one go. Contact support.");

  const openingCash = rupeesToPaisa(input.openingCash) ?? 0;
  const countedCash = rupeesToPaisa(input.countedCash) ?? 0;
  const totals = closingTotals({ sales: salesSnap.docs.map((d) => d.data()), returns: returnsSnap.docs.map((d) => d.data()), openingCash,
    collections: paySnap.docs.map((d) => d.data()), supplierPayments: spaySnap.docs.map((d) => d.data()),
    repairs: repairSnap.docs.map((d) => d.data()), expenses: expenseSnap.docs.map((d) => d.data()).filter((e) => e.status === "ACTIVE"),
  });
  const ref = docRef(ctx, "dailyClosings", `${input.branchId}_${input.date}`);
  const now = FieldValue.serverTimestamp();
  try {
    await ref.create({
      branchId: input.branchId, branchName: branch.data().name ?? "", date: input.date, timeZone, ...totals,
      countedCash, difference: countedCash - totals.expectedCash, note: input.note, closedBy: ctx.user.uid, createdAt: now,
    });
  } catch (error) {
    if (error?.code === 6 || /already exists/i.test(error?.message ?? "")) throw conflict("ALREADY_CLOSED", "This branch is already closed for that day.");
    throw error;
  }
  await col(ctx, "auditLogs").add({
    action: "DAY_CLOSED", actorUid: ctx.user.uid, targetType: "dailyClosing", targetId: ref.id, createdAt: now,
    detail: { expectedCash: totals.expectedCash, countedCash, difference: countedCash - totals.expectedCash },
  });
  return { id: ref.id, expectedCash: totals.expectedCash, difference: countedCash - totals.expectedCash };
}
