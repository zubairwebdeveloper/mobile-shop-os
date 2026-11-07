import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { branchScopes } from "@/lib/finance/data";
import { assertBranch, col, docRef, mayUseBranch } from "@/lib/inventory/common";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { serializeLeave } from "./attendance";
import { leaveDays, rangesOverlap, validateLeaveRange } from "./pure";

/**
 * Leave requests, entered by a manager or owner on the employee's behalf (staff have no self-service screen yet).
 * PENDING -> APPROVED / REJECTED / CANCELLED, and APPROVED -> CANCELLED. Two live requests of one person may not overlap.
 * Approved leave shows as LEAVE in the attendance summary on days that have no explicit mark; it does not rewrite attendance.
 */

export async function listLeaves(ctx, { branchId, status } = {}) {
  const scopes = branchScopes(ctx, branchId);
  const snaps = await Promise.all(scopes.map((b) => {
    let q = b ? col(ctx, "leaveRequests").where("branchId", "==", b) : col(ctx, "leaveRequests");
    if (status) q = q.where("status", "==", status);
    return q.limit(300).get();
  }));
  return snaps.flatMap((s) => s.docs).map(serializeLeave).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function requestLeave(ctx, input) {
  const range = validateLeaveRange(input.from, input.to);
  if (!range.ok) throw conflict("BAD_DATES", range.message);
  const ref = col(ctx, "leaveRequests").doc();
  await adminDb().runTransaction(async (tx) => {
    const emp = await tx.get(docRef(ctx, "employees", input.employeeId));
    if (!emp.exists || !mayUseBranch(ctx, emp.data().branchId)) throw notFound("Employee not found.");
    assertBranch(ctx, emp.data().branchId);
    if (emp.data().status !== "ACTIVE") throw conflict("EMPLOYEE_UNAVAILABLE", "This employee is not active.");
    const live = await tx.get(col(ctx, "leaveRequests").where("employeeId", "==", input.employeeId).limit(200));
    const clash = live.docs.some((d) => ["PENDING", "APPROVED"].includes(d.data().status) && rangesOverlap(d.data(), input));
    if (clash) throw conflict("LEAVE_OVERLAP", "This overlaps another pending or approved leave.");
    const now = FieldValue.serverTimestamp();
    tx.set(ref, {
      employeeId: input.employeeId, employeeName: emp.data().name, branchId: emp.data().branchId, type: input.type, from: input.from, to: input.to,
      days: leaveDays(input.from, input.to), reason: input.reason, status: "PENDING", requestedBy: ctx.user.uid, createdAt: now,
    });
    tx.set(col(ctx, "auditLogs").doc(), { action: "LEAVE_REQUESTED", actorUid: ctx.user.uid, targetType: "leave", targetId: ref.id, createdAt: now, detail: { days: leaveDays(input.from, input.to) } });
  });
  return { id: ref.id };
}

const ALLOWED = { PENDING: ["APPROVED", "REJECTED", "CANCELLED"], APPROVED: ["CANCELLED"] };

export async function decideLeave(ctx, id, { decision, note }) {
  if (!isSafeId(id)) throw notFound("Leave request not found.");
  const ref = docRef(ctx, "leaveRequests", id);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) throw notFound("Leave request not found.");
    assertBranch(ctx, snap.data().branchId);
    if (!(ALLOWED[snap.data().status] ?? []).includes(decision)) throw conflict("INVALID_TRANSITION", "That leave request cannot change to this status.");
    const now = FieldValue.serverTimestamp();
    tx.update(ref, { status: decision, decisionNote: note, decidedBy: ctx.user.uid, decidedAt: now });
    tx.set(col(ctx, "auditLogs").doc(), { action: `LEAVE_${decision}`, actorUid: ctx.user.uid, targetType: "leave", targetId: id, createdAt: now, detail: {} });
  });
  return { ok: true };
}
