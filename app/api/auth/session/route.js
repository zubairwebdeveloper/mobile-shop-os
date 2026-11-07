import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import {
  SESSION_COOKIE,
  createSessionCookieValue,
  getSessionUser,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { readJson } from "@/lib/security/body";
import { json, route } from "@/lib/security/http";
import { assertSameOrigin } from "@/lib/security/origin";

// firebase-admin needs the Node.js runtime

const bodySchema = z.object({ idToken: z.string().min(20).max(4096) });

/** Creates the platform profile on first login and records the last login time. */
async function upsertPlatformUser(identity) {
  const ref = adminDb().doc(`platformUsers/${identity.uid}`);
  const snap = await ref.get();
  const now = FieldValue.serverTimestamp();
  if (snap.exists) {
    await ref.update({ email: identity.email, lastLoginAt: now });
  } else {
    await ref.set({
      email: identity.email,
      displayName: identity.displayName,
      createdAt: now,
      lastLoginAt: now,
    });
  }
}

/** POST: exchange a fresh Firebase ID token for an httpOnly session cookie. */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { idToken } = bodySchema.parse(await readJson(request));

  let result;
  try {
    result = await createSessionCookieValue(idToken);
  } catch (error) {
    if (error?.name === "AppError") throw error;
    // Any Firebase verification failure: same generic response (no token details leaked).
    return json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } }, 401);
  }

  await upsertPlatformUser(result.identity);

  const response = json({ ok: true, emailVerified: result.identity.emailVerified });
  response.cookies.set(SESSION_COOKIE, result.sessionCookie, sessionCookieOptions());
  return response;
});

/** DELETE: sign out. With ?all=1 the user's refresh tokens are revoked (sign out everywhere). */
export const DELETE = route(async (request) => {
  assertSameOrigin(request);

  if (new URL(request.url).searchParams.get("all") === "1") {
    const user = await getSessionUser();
    if (user) await adminAuth().revokeRefreshTokens(user.uid);
  }

  const response = json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
});
