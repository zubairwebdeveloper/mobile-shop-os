import "server-only";

import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { AppError, forbidden, unauthenticated } from "@/lib/security/errors";

export const SESSION_COOKIE = "msos_session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

const RECENT_SIGNIN_SECONDS = 5 * 60;

const DEV_SESSION = {
  user: {
    uid: "dev-user",
    email: "dev@example.com",
    emailVerified: true,
    name: "Development Admin",
  },
  platformRole: "SUPER_ADMIN",
  memberships: [],
  activeTenantId: "dev-tenant",
};

function isDevelopmentAdminEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_PLATFORM_ADMIN === "true"
  );
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
  };
}

export async function createSessionCookieValue(idToken) {
  const auth = adminAuth();

  const decoded = await auth.verifyIdToken(idToken, true);

  const ageSeconds = Date.now() / 1000 - decoded.auth_time;

  if (ageSeconds > RECENT_SIGNIN_SECONDS) {
    throw new AppError("RECENT_SIGNIN_REQUIRED", 401, "Please sign in again.");
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  return {
    sessionCookie,
    identity: {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
      displayName: decoded.name ?? null,
    },
  };
}

export async function getSessionUser() {
  if (isDevelopmentAdminEnabled()) {
    return {
      uid: DEV_SESSION.user.uid,
      email: DEV_SESSION.user.email,
      emailVerified: DEV_SESSION.user.emailVerified,
    };
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  if (isDevelopmentAdminEnabled()) {
    return DEV_SESSION;
  }

  const user = await getSessionUser();

  return user ? { user } : null;
}

export async function requireSession() {
  if (isDevelopmentAdminEnabled()) {
    return DEV_SESSION;
  }

  const user = await getSessionUser();

  if (!user) {
    throw unauthenticated();
  }

  return { user };
}

export async function requireUser() {
  if (isDevelopmentAdminEnabled()) {
    return DEV_SESSION.user;
  }

  const user = await getSessionUser();

  if (!user) {
    throw unauthenticated();
  }

  return user;
}

export async function requireVerifiedUser() {
  if (isDevelopmentAdminEnabled()) {
    return DEV_SESSION.user;
  }

  const user = await requireUser();

  if (!user.emailVerified) {
    throw forbidden();
  }

  return user;
}

export async function requirePlatformAdminSession() {
  if (isDevelopmentAdminEnabled()) {
    return DEV_SESSION;
  }

  const user = await requireUser();

  // Production platform-admin authorization must be implemented
  // using your existing Firestore platformAdmins collection.
  const snap = await adminAuth()
    .getUser(user.uid)
    .catch(() => null);

  if (!snap) {
    throw forbidden();
  }

  // This verifies Firebase user existence, NOT platform-admin status.
  // Replace with your actual platformAdmins/{uid} role check.
  throw forbidden();
}

export async function getOptionalSession() {
  if (isDevelopmentAdminEnabled()) {
    return DEV_SESSION;
  }

  return getSession();
}

export async function requireTenantPermission(permission) {
  if (isDevelopmentAdminEnabled()) {
    return {
      session: DEV_SESSION,
      access: {
        allowed: true,
        permission,
        tenantId: DEV_SESSION.activeTenantId,
      },
    };
  }

  // Production tenant permission checks must use your existing
  // Firestore membership and permission matrix implementation.
  throw new Error(
    "Production tenant permission authorization is not configured.",
  );
}
