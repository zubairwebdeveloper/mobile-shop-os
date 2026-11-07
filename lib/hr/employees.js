import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { rupeesToPaisa } from "@/lib/catalog/pure";
import { branchScopes } from "@/lib/finance/data";
import { assertBranch, col, docRef, iso, mayUseBranch } from "@/lib/inventory/common";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { MAX_EMPLOYEES, ratePercentToBps } from "./pure";

/**
 * Staff records (HR). An employee may be linked to ONE team member account (so their sales can be credited); the link is claimed in
 * `employeeLinks/{uid}` inside the same transaction. These records are not login accounts: roles and access stay in Team.
 * Needs employees:read / employees:write and access to the employee's branch. No pay or salary is stored.
 */

export const serializeEmployee = (d) => {
  const e = d.data();
  return {
    id: d.id, name: e.name, phone: e.phone ?? "", designation: e.designation ?? "", branchId: e.branchId, branchName: e.branchName ?? "",
    memberUid: e.memberUid ?? null, joinDate: e.joinDate, commissionBps: e.commissionBps ?? 0, monthlyTarget: e.monthlyTarget ?? 0,
    status: e.status, note: e.note ?? "", createdAt: iso(e.createdAt),
  };
};

export async function listEmployees(ctx, { branchId, activeOnly = false } = {}) {
  const scopes = branchScopes(ctx, branchId);
  const snaps = await Promise.all(scopes.map((b) => (b ? col(ctx, "employees").where("branchId", "==", b) : col(ctx, "employees")).limit(MAX_EMPLOYEES + 1).get()));
  const rows = snaps.flatMap((s) => s.docs).map(serializeEmployee).filter((e) => !activeOnly || e.status === "ACTIVE");
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEmployee(ctx, id) {
  if (!isSafeId(id)) return null;
  const snap = await docRef(ctx, "employees", id).get();
  if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) return null;
  return serializeEmployee(snap);
}

/** Team members that can be linked (active, not already linked). */
export async function linkableMembers(ctx) {
  const [members, links] = await Promise.all([col(ctx, "members").where("status", "==", "ACTIVE").limit(300).get(), col(ctx, "employeeLinks").limit(500).get()]);
  const taken = new Set(links.docs.map((d) => d.id));
  return members.docs.filter((m) => !taken.has(m.id)).map((m) => ({ uid: m.id, name: m.data().displayName || m.data().email || m.id, role: m.data().role }));
}

async function prepareLink(tx, ctx, memberUid, selfId) {
  if (!memberUid) return null;
  const [member, claim] = await Promise.all([tx.get(docRef(ctx, "members", memberUid)), tx.get(docRef(ctx, "employeeLinks", memberUid))]);
  if (!member.exists || member.data().status !== "ACTIVE") throw conflict("MEMBER_UNAVAILABLE", "That team member is not active in this shop.");
  if (claim.exists && claim.data().employeeId !== selfId) throw conflict("MEMBER_ALREADY_LINKED", "That team member is already linked to another employee.");
  return claim;
}

export async function createEmployee(ctx, input) {
  assertBranch(ctx, input.branchId);
  const ref = col(ctx, "employees").doc();
  await adminDb().runTransaction(async (tx) => {
    const [branch, all] = await Promise.all([tx.get(docRef(ctx, "branches", input.branchId)), tx.get(col(ctx, "employees").select().limit(MAX_EMPLOYEES))]);
    if (!branch.exists) throw notFound("Branch not found.");
    if (all.size >= MAX_EMPLOYEES) throw conflict("EMPLOYEE_RECORD_LIMIT", `At most ${MAX_EMPLOYEES} staff records.`);
    await prepareLink(tx, ctx, input.memberUid, ref.id);
    const now = FieldValue.serverTimestamp();
    if (input.memberUid) tx.set(docRef(ctx, "employeeLinks", input.memberUid), { employeeId: ref.id, createdAt: now });
    tx.set(ref, {
      name: input.name, phone: input.phone, designation: input.designation, branchId: input.branchId, branchName: branch.data().name ?? "",
      memberUid: input.memberUid ?? null, joinDate: input.joinDate, commissionBps: ratePercentToBps(input.commissionPercent) ?? 0,
      monthlyTarget: rupeesToPaisa(input.monthlyTarget) ?? 0, status: "ACTIVE", note: input.note, createdBy: ctx.user.uid, createdAt: now,
    });
    tx.set(col(ctx, "auditLogs").doc(), { action: "EMPLOYEE_CREATED", actorUid: ctx.user.uid, targetType: "employee", targetId: ref.id, createdAt: now, detail: {} });
  });
  return { id: ref.id };
}

export async function updateEmployee(ctx, id, input) {
  if (!isSafeId(id)) throw notFound("Employee not found.");
  const ref = docRef(ctx, "employees", id);
  await adminDb().runTransaction(async (tx) => {
    const [snap, branch] = await Promise.all([tx.get(ref), tx.get(docRef(ctx, "branches", input.branchId))]);
    if (!snap.exists || !mayUseBranch(ctx, snap.data().branchId)) throw notFound("Employee not found.");
    assertBranch(ctx, snap.data().branchId);
    assertBranch(ctx, input.branchId);
    if (!branch.exists) throw notFound("Branch not found.");
    const oldUid = snap.data().memberUid ?? null;
    const newUid = input.memberUid ?? null;
    if (newUid !== oldUid) await prepareLink(tx, ctx, newUid, id);
    const now = FieldValue.serverTimestamp();
    if (newUid !== oldUid) {
      if (oldUid) tx.delete(docRef(ctx, "employeeLinks", oldUid));
      if (newUid) tx.set(docRef(ctx, "employeeLinks", newUid), { employeeId: id, createdAt: now });
    }
    tx.update(ref, {
      name: input.name, phone: input.phone, designation: input.designation, branchId: input.branchId, branchName: branch.data().name ?? "",
      memberUid: newUid, joinDate: input.joinDate, commissionBps: ratePercentToBps(input.commissionPercent) ?? 0,
      monthlyTarget: rupeesToPaisa(input.monthlyTarget) ?? 0, status: input.status, note: input.note, updatedAt: now,
    });
    tx.set(col(ctx, "auditLogs").doc(), { action: "EMPLOYEE_UPDATED", actorUid: ctx.user.uid, targetType: "employee", targetId: id, createdAt: now, detail: { status: input.status } });
  });
  return { ok: true };
}
