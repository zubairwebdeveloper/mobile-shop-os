import { forbidden } from "./errors";

/**
 * CSRF defence-in-depth for cookie-authenticated, state-changing routes (on top of SameSite=Lax):
 * the browser-sent Origin header must match this app. Requests without an Origin header are rejected.
 * Set APP_ORIGIN (e.g. https://app.example.com) in production; the Host header is a fallback.
 */
export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) throw forbidden();

  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden();
  }

  const allowed = new Set();
  if (process.env.APP_ORIGIN) {
    try {
      allowed.add(new URL(process.env.APP_ORIGIN).host);
    } catch {
      /* ignore malformed APP_ORIGIN */
    }
  }
  const host = request.headers.get("host");
  if (host) allowed.add(host);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) allowed.add(forwardedHost);

  if (!allowed.has(originHost)) throw forbidden();
}
