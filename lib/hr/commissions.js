import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { branchScopes } from "@/lib/finance/data";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { dayKey } from "@/lib/sales/pure";
import { conflict, notFound } from "@/lib/security/errors";
import { getShopSettings } from "@/lib/tenant/settings";
import { getEmployee } from "./employees";
import { employeePerformance, netSalesOf } from "./performance";
import { commissionFor, monthRange } from "./pure";

/**
 * Monthly commission. The live preview is shown for any month; FINALIZE (employees:write) snapshots the employee's net sales and rate for a
 * month that has ENDED into commissions/{employeeId_YYYY-MM}, once, and it cannot be edited afterwards (later returns do not change it).
 * The server recomputes the sales itself. MARK_PAID only changes the status: record the money you handed over as an expense (Salary).
 */

const serialize = (d) => ({ id: d.id, ...d.data(), createdAt: iso(d.data().createdAt), paidAt: iso(d.data().paidAt) });

export async function listCommissions(ctx, { month, branchId }) {
  const scopes = branchScopes(ctx, branchId);
  const snaps = await Promise.all(scopes.map((b) => (b ? col(ctx, "commissions").where("branchId", "==", b) : col(ctx, "commissions")).where("month", "==", month).limit(400).get()));
  return snaps.flatMap((s) => s.docs).map(serialize);
}

export async function commissionMonth(ctx, { month, branchId }) {
  const { from, to } = monthRange(month);
  const [perf, records] = await Promise.all([employeePerformance(ctx, { from, to, branchId }), listCommissions(ctx, { month, branchId })]);
  const byEmp = new Map(records.map((r) => [r.employeeId, r]));
  return { month, unlinked: perf.unlinked, rows: perf.rows.map((r) => ({ ...r, record: byEmp.get(r.employeeId) ?? null })) };
}

export async function finalizeCommission(ctx, { employeeId, month }) {
  const employee = await getEmployee(ctx, employeeId);
  if (!employee) throw notFound("Employee not found.");
  assertBranch(ctx, employee.branchId);
  const { timezone } = await getShopSettings(ctx);
  if (month >= dayKey(new Date(), timezone).slice(0, 7)) throw conflict("MONTH_NOT_ENDED", "Commission can be finalised only after the month has ended.");
  if (!employee.memberUid) throw conflict("NOT_LINKED", "Link this employee to a team member account so sales can be credited.");
  const { from, to } = monthRange(month);
  const { salesCount, netSales } = await netSalesOf(ctx, employee, { from, to });
  const amount = commissionFor(netSales, employee.commissionBps);
  const ref = docRef(ctx, "commissions", `${employeeId}_${month}`);
  const now = FieldValue.serverTimestamp();
  try {
    await ref.create({
      employeeId, employeeName: employee.name, branchId: employee.branchId, month, salesCount, netSales, rateBps: employee.commissionBps, amount,
      status: "APPROVED", finalizedBy: ctx.user.uid, createdAt: now,
    });
  } catch (error) {
    if (error?.code === 6 || /already exists/i.test(error?.message ?? "")) throw conflict("ALREADY_FINALIZED", "This month is already finalised for this employee.");
    throw error;
  }
  await col(ctx, "auditLogs").add({ action: "COMMISSION_FINALIZED", actorUid: ctx.user.uid, targetType: "commission", targetId: ref.id, createdAt: now, detail: { month, amount } });
  return { id: ref.id, amount, netSales };
}

export async function markCommissionPaid(ctx, { employeeId, month }) {
  const ref = docRef(ctx, "commissions", `${employeeId}_${month}`);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) throw notFound("Commission record not found.");
    assertBranch(ctx, snap.data().branchId);
    if (snap.data().status !== "APPROVED") throw conflict("INVALID_STATE", "This commission is already paid.");
    const now = FieldValue.serverTimestamp();
    tx.update(ref, { status: "PAID", paidBy: ctx.user.uid, paidAt: now });
    tx.set(col(ctx, "auditLogs").doc(), { action: "COMMISSION_PAID", actorUid: ctx.user.uid, targetType: "commission", targetId: ref.id, createdAt: now, detail: { month, amount: snap.data().amount } });
  });
  return { ok: true };
}
