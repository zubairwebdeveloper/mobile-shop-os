# ONBOARDING.md — Multi-tenant onboarding (Phase 3)

## Flow
1. **Register** (`/register`): Firebase Auth account + verification email + server session.
2. **Verify email** (`/verify-email`): user clicks the emailed link, then "I have verified my email". The server
   session is recreated because its `email_verified` claim is fixed at creation time.
3. **Apply** (`/onboarding`): shop name, shop address (slug), owner, phone, city, street address, expected
   branches. Needs a verified email (checked on the server).
4. **Review** (`/platform/applications`): a platform admin approves or rejects (rejection needs a reason).
5. **Tenant creation** (on approval, one Firestore transaction): tenant, OWNER membership (all branches),
   `userTenants` index, main branch, slug claim, application -> APPROVED, platform + tenant audit logs.
6. **Dashboard**: the owner is redirected to `/dashboard`; `/dashboard/branches` adds further branches.

Rejected applicants see the reason and can resubmit. Pending and approved applicants cannot submit again.

## Why it cannot end half-created
Approval is a single transaction; Firestore commits all writes or none. Retries reuse the same pre-generated
tenant ID. Two admins approving simultaneously: the second transaction re-reads the application, sees
`APPROVED`, and fails with `ALREADY_DECIDED`.

## Data model changes (deviations from FIRESTORE_SCHEMA.md draft)
| Path | Change |
|---|---|
| `tenantApplications/{applicantUid}` | Document ID is the **applicant uid**, not an auto ID: one application per user by construction, so duplicates are impossible. History lives in `platformAuditLogs`. Fields: applicantUid, applicantEmail, shopName, slug, ownerName, phone, city, address, expectedBranches, status, submissionCount, reviewedBy/At, rejectionReason, tenantId |
| `tenantSlugs/{slug}` | New. Claims a shop address; written only in the approval transaction. No client access at all |
| `platformUsers/{uid}` | Created/updated by the session endpoint (email, displayName, createdAt, lastLoginAt) |
| `tenants/{id}` | Adds `limits` (placeholder snapshot), `counters.branches`, `settings`, `profile`, `createdFromApplicationId` |
| Index | `tenantApplications`: status ASC + createdAt ASC (in `firestore.indexes.json`) |

`DEFAULT_LIMITS` in `src/lib/plans/defaults.js` (3 branches, 10 employees, 0 AI requests) are **placeholders, not
pricing**. Real plans arrive in Phase 17.

## Security notes
- Applicant identity, status and tenant ID are never read from the request body (the schema strips unknown keys).
- Platform admin is checked server-side on every decision; the layout 404s for everyone else.
- All state-changing routes check `Origin` and return safe, generic errors.
- Sign-in failures are generic. Forgot-password always says "if an account exists...".
  `auth/email-already-in-use` on registration does reveal that an email exists; enabling Firebase's
  *email enumeration protection* in the console removes that. Decide before launch.
- Not yet: rate limiting on these endpoints, CAPTCHA/App Check, notification email to applicants on decision
  (needs an email provider, not chosen yet), Google sign-in, invitation acceptance (Phase 5).

## Testing the whole flow locally (emulators, no real Firebase)
```
cp .env.emulator.example .env.local
npm run emulators            # terminal 1
npm run seed:emulator        # terminal 2 (creates demo-admin, demo tenants)
npm run dev                  # terminal 3
```
1. Register a new user at `/register`. The Auth emulator prints the verification link in the emulator terminal
   (and shows it in the emulator UI at http://127.0.0.1:4000/auth). Open it, then press "I have verified my email".
2. Submit the shop application.
3. Sign out, sign in as `admin@platform.demo` (password printed by the seed script), open `/platform/applications`.
4. Approve. Sign in again as the applicant: `/dashboard` and `/dashboard/branches` now work.
