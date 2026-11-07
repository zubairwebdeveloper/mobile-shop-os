# SECURITY.md (Phase 2 baseline)

## Sessions
- Login happens in the browser with Firebase Auth; the ID token is exchanged at `POST /api/auth/session` for a
  Firebase **session cookie** (`httpOnly`, `Secure` in production, `SameSite=Lax`, 5 days).
- The ID token must be recent (<= 5 minutes since sign-in) and is checked for revocation.
- Every request verifies the session cookie with `checkRevoked = true`, so disabled or revoked accounts lose
  access immediately. `DELETE /api/auth/session?all=1` revokes all refresh tokens (sign out everywhere).
- State-changing cookie routes also require a matching `Origin` header (`assertSameOrigin`).

## Secrets
- Admin credentials only via server env vars (`.env.example` lists names only). `src/lib/firebase/admin.js`
  imports `server-only`, so importing it from a Client Component fails the build.
- Emulator variables are refused when `NODE_ENV=production`.
- Route errors never return stack traces; unknown errors log only the error name.
- `ALLOW_UNAUTHENTICATED_DASHBOARD_DEV` is ignored in production builds.

## Platform admin
Only `scripts/bootstrap-admin.js` writes `platformAdmins/{uid}`. It requires an existing verified user and
`--confirm-project` equal to the target project. Rules deny all client writes to that collection.

## Not done yet (by design, later phases)
- Email verification flow, password reset, registration UI (Phase 3).
- Rate limiting and login history (Phase 3/19). Without a shared store (e.g. Redis) in-memory limits are
  unreliable on serverless, so this needs a hosting decision.
- Firebase App Check (Phase 19, needs a real project and testing before enforcement).
- Security headers / CSP, audit-log writer, per-tenant entitlement checks.
- Server-route integration tests with the Admin SDK emulator.

## Known risks to watch
- Role lists are duplicated in JS and in two rules files; drift is possible. Rule tests are the guard.
- `get()` calls in rules are billed reads; heavy list screens should prefer server routes.
- Branch-scoped documents without a `branchId` are unreadable by design; the server must always write it.
