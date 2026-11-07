import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAllById } from "@/lib/finance/data";
import { assertBranch, col, docRef, iso } from "@/lib/inventory/common";
import { dayKey } from "@/lib/sales/pure";
import { conflict } from "@/lib/security/errors";
import { getShopSettings } from "@/lib/tenant/settings";
import { listEmployees } from "./employees";
import { attendanceSummary, monthRange } from "./pure";

/**
 * Daily attendance, marked by a manager or owner (employees:write) for one branch and day. One record per employee per day
 * (document id employeeId_date), so a re-mark corrects it instead of duplicating it. Future days cannot be marked.
 */

export async function daySheet(ctx, { branchId, date }) {
  assertBranch(ctx, branchId);
  const employees = (await listEmployees(ctx, { branchId, activeOnly: true })).filter((e) => e.joinDate <= date);
  const [records, leaves] = await Promise.all([
    getAllById(ctx, "attendance", employees.map((e) => `${e.id}_${date}`)),
    col(ctx, "leaveRequests").where("branchId", "==", branchId).where("status", "==", "APPROVED").limit(500).get(),
  ]);
  const marked = new Map(records.filter((r) => r.exists).map((r) => [r.data().employeeId, r.data()]));
  const onLeave = new Set(leaves.docs.filter((l) => l.data().from <= date && date <= l.data().to).map((l) => l.data().employeeId));
  return employees.map((e) => ({ ...e, status: marked.get(e.id)?.status ?? null, note: marked.get(e.id)?.note ?? "", onApprovedLeave: onLeave.has(e.id) }));
}

export async function markAttendance(ctx, input) {
  assertBranch(ctx, input.branchId);
  const { timezone } = await getShopSettings(ctx);
  if (input.date > dayKey(new Date(), timezone)) throw conflict("FUTURE_DATE", "You cannot mark attendance for a day that has not started.");
  const ids = input.entries.map((e) => e.employeeId);
  if (new Set(ids).size !== ids.length) throw conflict("DUPLICATE_ENTRY", "A person appears twice.");
  await adminDb().runTransaction(async (tx) => {
    const [emps, existing] = await Promise.all([
      Promise.all(ids.map((id) => tx.get(docRef(ctx, "employees", id)))),
      Promise.all(ids.map((id) => tx.get(docRef(ctx, "attendance", `${id}_${input.date}`)))),
    ]);
    const now = FieldValue.serverTimestamp();
    input.entries.forEach((entry, i) => {
      const e = emps[i];
      if (!e.exists || e.data().branchId !== input.branchId || e.data().status !== "ACTIVE") throw conflict("EMPLOYEE_UNAVAILABLE", "A person is not an active employee of this branch.");
      if (input.date < e.data().joinDate) throw conflict("BEFORE_JOIN_DATE", `${e.data().name} had not joined on that date.`);
      const ref = docRef(ctx, "attendance", `${entry.employeeId}_${input.date}`);
      const base = { employeeId: entry.employeeId, branchId: input.branchId, date: input.date, month: input.date.slice(0, 7), status: entry.status, note: entry.note };
      if (existing[i].exists) tx.update(ref, { ...base, updatedBy: ctx.user.uid, updatedAt: now });
      else tx.set(ref, { ...base, markedBy: ctx.user.uid, createdAt: now });
    });
    tx.set(col(ctx, "auditLogs").doc(), {
      action: "ATTENDANCE_MARKED", actorUid: ctx.user.uid, targetType: "attendance", targetId: `${input.branchId}_${input.date}`, createdAt: now, detail: { count: ids.length },
    });
  });
  return { ok: true, count: ids.length };
}

/** One employee's month (summary plus the day records). */
export async function employeeMonth(ctx, employee, month) {
  const { from, to } = monthRange(month);
  const { timezone } = await getShopSettings(ctx);
  const [recSnap, leaveSnap] = await Promise.all([
    col(ctx, "attendance").where("employeeId", "==", employee.id).where("month", "==", month).limit(40).get(),
    col(ctx, "leaveRequests").where("employeeId", "==", employee.id).limit(100).get(),
  ]);
  const records = recSnap.docs.map((d) => ({ date: d.data().date, status: d.data().status, note: d.data().note ?? "" })).sort((a, b) => a.date.localeCompare(b.date));
  const leaves = leaveSnap.docs.map((d) => d.data()).filter((l) => l.from <= to && l.to >= from);
  return { month, records, summary: attendanceSummary({ month, today: dayKey(new Date(), timezone), records, leaves, joinDate: employee.joinDate }) };
}

export const serializeLeave = (d) => {
  const l = d.data();
  return { id: d.id, employeeId: l.employeeId, employeeName: l.employeeName ?? "", branchId: l.branchId, type: l.type, from: l.from, to: l.to, days: l.days, reason: l.reason ?? "", status: l.status, decisionNote: l.decisionNote ?? "", createdAt: iso(l.createdAt) };
};
