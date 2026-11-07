import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { conflict, forbidden, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { emailsMatch, hasSeatAvailable, memberEditBlockReason, normalizeBranchScope } from "@/lib/team/rules";

/**
 * Team services. `ctx` MUST come from requireTenantAccess(tenantId, { permission: members:manage }).
 * Access is enforced per request against the member document, so disabling a member takes effect at once.
 */

const iso = (value) => value?.toDate?.().toISOString() ?? null;

const serializeMember = (doc) => {
  const d = doc.data();
  return {
    uid: doc.id,
    displayName: d.displayName ?? "",
    email: d.email ?? "",
    role: d.role,
    status: d.status,
    allBranches: d.allBranches === true,
    branchIds: Array.isArray(d.branchIds) ? d.branchIds : [],
  };
};

const serializeInvitation = (doc) => {
  const d = doc.data();
  return {
    id: doc.id,
    email: d.email,
    role: d.role,
    allBranches: d.allBranches === true,
    branchIds: d.branchIds ?? [],
    createdAt: iso(d.createdAt),
  };
};

export async function listMembers(ctx) {
  const snap = await adminDb().collection(`tenants/${ctx.tenantId}/members`).get();
  const rank = { OWNER: 0 };
  return snap.docs
    .map(serializeMember)
    .sort((a, b) => (rank[a.role] ?? 1) - (rank[b.role] ?? 1) || a.displayName.localeCompare(b.displayName));
}

export async function listPendingInvitations(ctx) {
  const snap = await adminDb()
    .collection("tenantInvitations")
    .where("tenantId", "==", ctx.tenantId)
    .where("status", "==", "PENDING")
    .get();
  return snap.docs.map(serializeInvitation);
}

async function existingBranchIds(tx, db, tenantId) {
  const snap = await tx.get(db.collection(`tenants/${tenantId}/branches`));
  return snap.docs.map((doc) => doc.id);
}

export async function updateMember(ctx, targetUid, input) {
  if (!isSafeId(targetUid)) throw notFound("Member not found.");
  const db = adminDb();
  const memberRef = db.doc(`tenants/${ctx.tenantId}/members/${targetUid}`);
  const indexRef = db.doc(`userTenants/${targetUid}/memberships/${ctx.tenantId}`);

  await db.runTransaction(async (tx) => {
    const [memberSnap, branchIds, activeSnap] = await Promise.all([
      tx.get(memberRef),
      existingBranchIds(tx, db, ctx.tenantId),
      tx.get(db.collection(`tenants/${ctx.tenantId}/members`).where("status", "==", "ACTIVE")),
    ]);
    if (!memberSnap.exists) throw notFound("Member not found.");
    const member = memberSnap.data();

    const blocked = memberEditBlockReason({ actorUid: ctx.user.uid, targetUid, targetRole: member.role });
    if (blocked) throw conflict("MEMBER_LOCKED", blocked);

    if (input.status === "ACTIVE" && member.status !== "ACTIVE") {
      const tenantSnap = await tx.get(db.doc(`tenants/${ctx.tenantId}`));
      if (!hasSeatAvailable(activeSnap.size, tenantSnap.data()?.limits?.maxEmployees)) {
        throw conflict("EMPLOYEE_LIMIT_REACHED", "Your plan's team limit has been reached.");
      }
    }

    const scope = normalizeBranchScope(input, branchIds);
    if (!scope.allBranches && scope.branchIds.length === 0) {
      throw conflict("NO_VALID_BRANCH", "None of the selected branches exist.");
    }

    const now = FieldValue.serverTimestamp();
    tx.update(memberRef, { role: input.role, status: input.status, ...scope, updatedAt: now, updatedBy: ctx.user.uid });
    tx.set(indexRef, { role: input.role, status: input.status }, { merge: true });
    tx.set(db.collection(`tenants/${ctx.tenantId}/auditLogs`).doc(), {
      action: "MEMBER_UPDATED",
      actorUid: ctx.user.uid,
      targetType: "member",
      targetId: targetUid,
      detail: { fromRole: member.role, toRole: input.role, fromStatus: member.status, toStatus: input.status },
      createdAt: now,
    });
  });
}

export async function createInvitation(ctx, input) {
  const db = adminDb();
  const invitationRef = db.collection("tenantInvitations").doc();

  await db.runTransaction(async (tx) => {
    const [branchIds, pending, members, tenantSnap] = await Promise.all([
      existingBranchIds(tx, db, ctx.tenantId),
      tx.get(
        db
          .collection("tenantInvitations")
          .where("tenantId", "==", ctx.tenantId)
          .where("email", "==", input.email)
          .where("status", "==", "PENDING")
      ),
      tx.get(db.collection(`tenants/${ctx.tenantId}/members`).where("email", "==", input.email)),
      tx.get(db.doc(`tenants/${ctx.tenantId}`)),
    ]);

    if (!pending.empty) throw conflict("INVITATION_EXISTS", "An invitation for this email is already pending.");
    if (!members.empty) {
      throw conflict("MEMBER_EXISTS", "This person is already on your team. Edit their access instead.");
    }

    const scope = normalizeBranchScope(input, branchIds);
    if (!scope.allBranches && scope.branchIds.length === 0) {
      throw conflict("NO_VALID_BRANCH", "None of the selected branches exist.");
    }

    const now = FieldValue.serverTimestamp();
    tx.set(invitationRef, {
      tenantId: ctx.tenantId,
      tenantName: tenantSnap.data()?.name ?? "",
      email: input.email,
      role: input.role,
      ...scope,
      status: "PENDING",
      invitedBy: ctx.user.uid,
      createdAt: now,
    });
    tx.set(db.collection(`tenants/${ctx.tenantId}/auditLogs`).doc(), {
      action: "INVITATION_CREATED",
      actorUid: ctx.user.uid,
      targetType: "invitation",
      targetId: invitationRef.id,
      createdAt: now,
    });
  });

  return { id: invitationRef.id };
}

export async function revokeInvitation(ctx, invitationId) {
  if (!isSafeId(invitationId)) throw notFound("Invitation not found.");
  const db = adminDb();
  const ref = db.doc(`tenantInvitations/${invitationId}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    // Another shop's invitation looks exactly like a missing one.
    if (!snap.exists || snap.data().tenantId !== ctx.tenantId) throw notFound("Invitation not found.");
    if (snap.data().status !== "PENDING") throw conflict("INVITATION_CLOSED", "This invitation is no longer pending.");

    const now = FieldValue.serverTimestamp();
    tx.update(ref, { status: "REVOKED", revokedAt: now, revokedBy: ctx.user.uid });
    tx.set(db.collection(`tenants/${ctx.tenantId}/auditLogs`).doc(), {
      action: "INVITATION_REVOKED",
      actorUid: ctx.user.uid,
      targetType: "invitation",
      targetId: invitationId,
      createdAt: now,
    });
  });
}

/** Pending invitations addressed to the signed-in, email-verified user. */
export async function listMyInvitations(user) {
  if (!user?.emailVerified || !user.email) return [];
  const snap = await adminDb()
    .collection("tenantInvitations")
    .where("email", "==", user.email.trim().toLowerCase())
    .where("status", "==", "PENDING")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, tenantName: doc.data().tenantName ?? "", role: doc.data().role }));
}

/**
 * Accepting creates the membership. Identity comes from the verified session; the tenant comes from the
 * invitation document, never from the request. A mismatching email looks exactly like a missing invitation.
 */
export async function acceptInvitation(user, invitationId) {
  if (!user?.emailVerified || !user.email) throw forbidden();
  if (!isSafeId(invitationId)) throw notFound("Invitation not found.");
  const db = adminDb();
  const inviteRef = db.doc(`tenantInvitations/${invitationId}`);

  let tenantId;
  await db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists || !emailsMatch(inviteSnap.data().email, user.email)) throw notFound("Invitation not found.");
    const invite = inviteSnap.data();
    if (invite.status !== "PENDING") throw conflict("INVITATION_CLOSED", "This invitation is no longer pending.");
    tenantId = invite.tenantId;

    const tenantRef = db.doc(`tenants/${tenantId}`);
    const memberRef = tenantRef.collection("members").doc(user.uid);
    const [tenantSnap, memberSnap, activeSnap, branchIds] = await Promise.all([
      tx.get(tenantRef),
      tx.get(memberRef),
      tx.get(tenantRef.collection("members").where("status", "==", "ACTIVE")),
      existingBranchIds(tx, db, tenantId),
    ]);

    if (!tenantSnap.exists || tenantSnap.data().status !== "ACTIVE") {
      throw conflict("TENANT_UNAVAILABLE", "This shop is not accepting new members right now.");
    }
    if (memberSnap.exists) throw conflict("MEMBERSHIP_EXISTS", "You already belong to this shop.");
    if (!hasSeatAvailable(activeSnap.size, tenantSnap.data().limits?.maxEmployees)) {
      throw conflict("EMPLOYEE_LIMIT_REACHED", "This shop's team limit has been reached.");
    }

    const scope = normalizeBranchScope(invite, branchIds);
    if (!scope.allBranches && scope.branchIds.length === 0) {
      throw conflict("NO_VALID_BRANCH", "The branches for this invitation no longer exist.");
    }

    const now = FieldValue.serverTimestamp();
    tx.set(memberRef, {
      role: invite.role,
      status: "ACTIVE",
      ...scope,
      displayName: user.displayName || user.email,
      email: user.email.trim().toLowerCase(),
      joinedAt: now,
      invitedBy: invite.invitedBy,
    });
    tx.set(db.doc(`userTenants/${user.uid}/memberships/${tenantId}`), {
      tenantName: tenantSnap.data().name ?? "",
      role: invite.role,
      status: "ACTIVE",
    });
    tx.update(inviteRef, { status: "ACCEPTED", acceptedBy: user.uid, acceptedAt: now });
    tx.set(tenantRef.collection("auditLogs").doc(), {
      action: "INVITATION_ACCEPTED",
      actorUid: user.uid,
      targetType: "member",
      targetId: user.uid,
      createdAt: now,
    });
  });

  return { tenantId };
}
