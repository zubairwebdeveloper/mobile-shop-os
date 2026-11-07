# Phase 2 Report — Firebase and Security Foundation

Scope: Firebase client/Admin, sessions, tenant authorization, permissions, rules, emulator tests.
No real Firebase project was touched. No billing, no deploy, no collections created (seed script
writes only to the local emulator).

## Verification status (read this first)
| Check | Result |
|---|---|
| Syntax of all 20 source/test/script files | Passed (0 errors) |
| Permission matrix unit tests (10 cases) | **Passed**, run with a small Vitest-compatible shim |
| `setup-phase2.sh` shell syntax | Passed |
| `npm install`, `next build`, lint | **Not run**: npm registry blocked in the authoring sandbox |
| **Firestore rules tests (30+ cases)** | **NOT RUN**: Firebase emulator could not be downloaded here |
| **Storage rules tests** | **NOT RUN**, and the most uncertain (cross-service lookups) |
| Session API, `requireTenantAccess` against a real/emulated Admin SDK | **NOT RUN** |

So the isolation guarantees are **designed and tested-on-paper, not proven**. Do not treat Phase 2 as
done until `npm run test:rules` passes on your machine. Expect that a few tests may need fixes; send me
the output and I will correct rules or tests.

## What was added
- `src/lib/firebase/{admin,client}.js` (Admin is `server-only`; emulator support; production guard)
- `src/lib/auth/session.js` (session cookie create/verify, revocation check, recent-sign-in rule)
- `src/lib/tenant/context.js` (`requireTenantAccess`, `requirePlatformAdmin`, `resolveActiveTenant`)
- `src/lib/permissions/matrix.js` (5 roles, 21 permissions, branch access)
- `src/lib/security/{errors,http,origin}.js`
- `src/app/api/auth/session/route.js`, `src/app/api/tenants/[tenantId]/me/route.js` (reference pattern)
- Dashboard layout now requires a session and an active tenant membership (redirects to `/login` or
  `/onboarding`); `TenantHydrator` fills Redux from server-verified data. Placeholder `/login` and `/onboarding`.
- `firestore.rules`, `storage.rules`, `firebase.json`, `firestore.indexes.json` (empty until real queries exist)
- Tests: `tests/unit`, `tests/firestore-rules`, `tests/storage-rules`; `vitest.config.mjs`
- `scripts/seed-demo-data.js` (emulator only, demo tenants Smart Mobile Hub and Tech Zone Mobiles, labelled
  `isDemo`), `scripts/bootstrap-admin.js`
- `.env.example`, `.env.emulator.example`, docs: SECURITY, TENANT_ISOLATION, PERMISSIONS

## Database / schema notes
Implements from `FIRESTORE_SCHEMA.md`: `tenants`, `members`, `branches`, `userTenants` reverse index,
`platformAdmins`, `platformPlans`, `tenantApplications` (read rules only). Open Phase 0 decisions
**still unanswered** and given defaults: hosting (undecided; code assumes Node runtime, not Edge),
IMEI-as-document-ID (deferred to Phase 6 when IMEI rules are written).

## Security decisions worth reviewing
1. **All client writes are denied**, including for owners. Every mutation is a server route. This is the
   safest model for financial data but means each feature needs a route (planned).
2. Missing tenant and non-member return the same 403 (no tenant enumeration).
3. Platform admin has **no** direct access to tenant business data in rules.
4. Collections for later phases have no rule yet, therefore are denied until their phase adds rules and tests.

## Limitations
- Storage rules use `firestore.get()` (limited to 2 lookups per evaluation); verify in the emulator.
- Branch-filtered list queries rely on the client adding `where('branchId','==',...)`.
- No registration, email verification, password reset UI yet (Phase 3).
- `firebase-admin` may need `serverExternalPackages: ["firebase-admin"]` in `next.config.mjs` on some Next versions.
- Firebase plan/pricing requirements for Auth session cookies, Storage and any server hosting were not
  verified online: **[VERIFY]** before connecting a real project. No billing was enabled.

## How to run
```
cd mobile-shop-os            # your Phase 1 project
bash /path/to/phase2/setup-phase2.sh
```
The script installs `firebase firebase-admin server-only zod` plus dev `firebase-tools vitest
@firebase/rules-unit-testing`, copies files, adds npm scripts, then runs unit tests, rules tests, lint, build.
Needs Java for the emulators.

## Approval
Please run it and send the output (especially `npm run test:rules`). After Phase 2 is green, the next
step is **Phase 3: Multi-tenant onboarding** (registration, email verification, shop application,
platform approval, tenant creation by trusted server code, owner membership, branch setup).
