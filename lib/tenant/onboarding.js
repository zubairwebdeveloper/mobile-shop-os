import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { conflict, notFound } from "@/lib/security/errors";
import { isSafeId } from "@/lib/security/ids";
import { buildTenantBundle } from "./bundle";

/**
 * Tenant onboarding (server only, no Next.js imports so it can be tested against the emulators).
 *
 * Data model:
 *  - tenantApplications/{applicantUid}  ONE application per user (document ID = uid). This makes
 *    duplicate pending applications impossible by construction. A REJECTED application can be
 *    resubmitted (submissionCount increments); PENDING and APPROVED cannot.
 *  - tenantSlugs/{slug}  claims the shop address; created together with the tenant.
 *
 * Approval writes tenant + owner membership + userTenants index + main branch + slug + audit logs
 * and flips the application to APPROVED in ONE Firestore transaction: either everything exists or
 * nothing does (no partial tenants), and a double click / two admins cannot create two tenants.
 */

const iso = (value) => value?.toDate?.().toISOString() ?? null;

const membershipsQuery = (db, uid) => db.collection(`userTenants/${uid}/memberships`).limit(1);

export async function submitApplication(user, input) {
  const db = adminDb();
  const appRef = db.doc(`tenantApplications/${user.uid}`);
  const slugRef = db.doc(`tenantSlugs/${input.slug}`);

  await db.runTransaction(async (tx) => {
    const [appSnap, slugSnap, memberSnap] = await Promise.all([
      tx.get(appRef),
      tx.get(slugRef),
      tx.get(membershipsQuery(db, user.uid)),
    ]);

    if (!memberSnap.empty) {
      throw conflict("MEMBERSHIP_EXISTS", "This account already belongs to a shop.");
    }
    if (slugSnap.exists) {
      throw conflict("SLUG_TAKEN", "That shop address is already taken. Please choose another.");
    }

    const previous = appSnap.exists ? appSnap.data() : null;
    if (previous && previous.status !== "REJECTED") {
      throw conflict(
        "APPLICATION_EXISTS",
        previous.status === "PENDING"
          ? "You already have an application under review."
          : "Your application was already approved."
      );
    }

    const now = FieldValue.serverTimestamp();
    tx.set(appRef, {
      applicantUid: user.uid,
      applicantEmail: user.email,
      shopName: input.shopName,
      slug: input.slug,
      ownerName: input.ownerName,
      phone: input.phone,
      city: input.city,
      address: input.address,
      expectedBranches: input.expectedBranches,
      status: "PENDING",
      submissionCount: (previous?.submissionCount ?? 0) + 1,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      tenantId: null,
    });
    tx.set(db.collection("platformAuditLogs").doc(), {
      action: "TENANT_APPLICATION_SUBMITTED",
      actorUid: user.uid,
      targetType: "tenantApplication",
      targetId: user.uid,
      createdAt: now,
    });
  });
}

export async function approveApplication(adminUid, applicationId) {
  if (!isSafeId(applicationId)) throw notFound("Application not found.");

  const db = adminDb();
  const appRef = db.doc(`tenantApplications/${applicationId}`);

  const preSnap = await appRef.get();
  if (!preSnap.exists) throw notFound("Application not found.");
  const applicantUid = preSnap.data().applicantUid;

  // Auth is not part of the Firestore transaction, so check it first: the applicant must still
  // exist, be enabled and have a verified email.
  let authUser;
  try {
    authUser = await adminAuth().getUser(applicantUid);
  } catch {
    throw conflict("APPLICANT_UNAVAILABLE", "The applicant account no longer exists.");
  }
  if (authUser.disabled) {
    throw conflict("APPLICANT_UNAVAILABLE", "The applicant account is disabled.");
  }
  if (!authUser.emailVerified) {
    throw conflict("APPLICANT_NOT_VERIFIED", "The applicant has not verified their email.");
  }

  // Created outside the transaction so a retried transaction reuses the same ID.
  const tenantRef = db.collection("tenants").doc();

  await db.runTransaction(async (tx) => {
    const appSnap = await tx.get(appRef);
    if (!appSnap.exists) throw notFound("Application not found.");
    const application = appSnap.data();

    if (application.status !== "PENDING") {
      throw conflict("ALREADY_DECIDED", "This application has already been decided.");
    }

    const slugRef = db.doc(`tenantSlugs/${application.slug}`);
    const [slugSnap, memberSnap] = await Promise.all([
      tx.get(slugRef),
      tx.get(membershipsQuery(db, application.applicantUid)),
    ]);
    if (slugSnap.exists) {
      throw conflict("SLUG_TAKEN", "That shop address is already taken. Reject this application with a reason.");
    }
    if (!memberSnap.empty) {
      throw conflict("MEMBERSHIP_EXISTS", "The applicant already belongs to a shop.");
    }

    const bundle = buildTenantBundle({
      application,
      ownerDisplayName: authUser.displayName,
    });
    const now = FieldValue.serverTimestamp();
    const branchRef = tenantRef.collection("branches").doc();

    tx.set(tenantRef, { ...bundle.tenant, createdFromApplicationId: applicationId, createdAt: now, updatedAt: now });
    tx.set(tenantRef.collection("members").doc(application.applicantUid), { ...bundle.member, createdAt: now });
    tx.set(branchRef, { ...bundle.branch, createdAt: now, createdBy: adminUid });
    tx.set(db.doc(`userTenants/${application.applicantUid}/memberships/${tenantRef.id}`), {
      ...bundle.membershipIndex,
      createdAt: now,
    });
    tx.set(slugRef, { tenantId: tenantRef.id, createdAt: now });
    tx.update(appRef, {
      status: "APPROVED",
      tenantId: tenantRef.id,
      reviewedBy: adminUid,
      reviewedAt: now,
      updatedAt: now,
      rejectionReason: null,
    });
    tx.set(db.collection("platformAuditLogs").doc(), {
      action: "TENANT_APPLICATION_APPROVED",
      actorUid: adminUid,
      targetType: "tenantApplication",
      targetId: applicationId,
      tenantId: tenantRef.id,
      createdAt: now,
    });
    tx.set(tenantRef.collection("auditLogs").doc(), {
      action: "TENANT_CREATED",
      actorUid: adminUid,
      targetType: "tenant",
      targetId: tenantRef.id,
      createdAt: now,
    });
  });

  return { tenantId: tenantRef.id };
}

export async function rejectApplication(adminUid, applicationId, reason) {
  if (!isSafeId(applicationId)) throw notFound("Application not found.");

  const db = adminDb();
  const appRef = db.doc(`tenantApplications/${applicationId}`);

  await db.runTransaction(async (tx) => {
    const appSnap = await tx.get(appRef);
    if (!appSnap.exists) throw notFound("Application not found.");
    if (appSnap.data().status !== "PENDING") {
      throw conflict("ALREADY_DECIDED", "This application has already been decided.");
    }

    const now = FieldValue.serverTimestamp();
    tx.update(appRef, {
      status: "REJECTED",
      rejectionReason: reason,
      reviewedBy: adminUid,
      reviewedAt: now,
      updatedAt: now,
    });
    tx.set(db.collection("platformAuditLogs").doc(), {
      action: "TENANT_APPLICATION_REJECTED",
      actorUid: adminUid,
      targetType: "tenantApplication",
      targetId: applicationId,
      createdAt: now,
    });
  });
}

/** The applicant's own application, reduced to the fields the UI needs (serialisable). */
export async function getUserApplication(uid) {
  const snap = await adminDb().doc(`tenantApplications/${uid}`).get();
  if (!snap.exists) return null;
  const data = snap.data();
  return {
    status: data.status,
    shopName: data.shopName,
    slug: data.slug,
    rejectionReason: data.rejectionReason ?? null,
    tenantId: data.tenantId ?? null,
    submissionCount: data.submissionCount ?? 1,
  };
}

/** Oldest first. Needs the composite index tenantApplications(status ASC, createdAt ASC). */
export async function listPendingApplications() {
  const snap = await adminDb()
    .collection("tenantApplications")
    .where("status", "==", "PENDING")
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      shopName: d.shopName,
      slug: d.slug,
      ownerName: d.ownerName,
      applicantEmail: d.applicantEmail,
      phone: d.phone,
      city: d.city,
      address: d.address,
      expectedBranches: d.expectedBranches,
      submissionCount: d.submissionCount ?? 1,
      createdAt: iso(d.createdAt),
    };
  });
}
