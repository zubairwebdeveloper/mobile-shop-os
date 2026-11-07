"use client";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { SessionError } from "./errors";

/**
 * Client helpers for the auth UI.
 * Flow: Firebase sign-in in the browser -> ID token -> server verifies it and sets an httpOnly
 * session cookie. The server session, not client state, protects pages and APIs.
 */

async function startServerSession(user, { forceRefresh = false } = {}) {
  const idToken = await user.getIdToken(forceRefresh);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new SessionError(
      body?.error?.message ?? "Could not start a session. Please try again.",
      body?.error?.code
    );
  }
  return response.json();
}

export async function signInWithPassword(email, password) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  try {
    await startServerSession(credential.user);
  } catch (error) {
    await signOut(auth);
    throw error;
  }
  return credential.user;
}

/** Creates the account, sends the verification email and starts a session (unverified until the link is used). */
export async function registerWithPassword({ displayName, email, password }) {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await sendEmailVerification(credential.user);
  try {
    // forceRefresh so the ID token carries the new display name
    await startServerSession(credential.user, { forceRefresh: true });
  } catch (error) {
    await signOut(auth);
    throw error;
  }
  return credential.user;
}

export async function resendVerificationEmail() {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  if (!auth.currentUser) throw new SessionError("Please sign in again.", "NO_USER");
  await sendEmailVerification(auth.currentUser);
}

/**
 * After the user clicked the link in the email: reload the Firebase user and, if verified,
 * replace the server session (its email_verified claim is fixed at creation time).
 * Returns "VERIFIED" | "NOT_VERIFIED" | "SIGN_IN_AGAIN".
 */
export async function confirmEmailVerified() {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return "SIGN_IN_AGAIN";

  await user.reload();
  if (!user.emailVerified) return "NOT_VERIFIED";

  try {
    await startServerSession(user, { forceRefresh: true });
    return "VERIFIED";
  } catch (error) {
    // The server requires a recent sign-in; an older login must authenticate again.
    if (error?.code === "RECENT_SIGNIN_REQUIRED") {
      await signOutSession();
      return "SIGN_IN_AGAIN";
    }
    throw error;
  }
}

/** Always resolves: callers show a generic message so account existence is not revealed. */
export async function sendPasswordReset(email) {
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  } catch (error) {
    if (error?.code === "auth/too-many-requests" || error?.code === "auth/network-request-failed") {
      throw error;
    }
    // user-not-found, invalid-email, etc.: intentionally ignored
  }
}

export async function signOutSession({ everywhere = false } = {}) {
  await fetch(`/api/auth/session${everywhere ? "?all=1" : ""}`, { method: "DELETE" });
  await signOut(getFirebaseAuth());
}
