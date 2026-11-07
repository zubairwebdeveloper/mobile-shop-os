# Mobile Shop OS — Phase 0 Report (Greenfield Audit)

Status: **Phase 0 only. No code, no packages, no Firebase changes, no deployment.**
Date: 2026-10-30

## 0. Audit scope and honest limitations

No repository, `package.json`, Firebase config, rules or env file was available in the session
(working directory empty, no upload other than the master prompt). Therefore:

- Items that describe an *existing* codebase (current architecture, folder structure, implementation
  inventory, build/runtime errors) are reported as **"nothing exists — greenfield"**.
- The npm registry was unreachable from this environment (security-policy 403), so **no package
  version numbers are asserted**. See `DEPENDENCY_COMPATIBILITY.md` for rules and a verification checklist.
- Firebase pricing/plan limits were not checked online. Anything marked **[VERIFY]** must be
  confirmed against current Firebase documentation before Phase 2.

If a real repo exists, send it and this report should be re-run as a true audit; sections 1-3
would be replaced, 4-10 would be adjusted.

## 1. Current architecture report
None. No application code, no Firebase project wiring, no auth, no rules, no Redux store.

## 2. Current folder structure
None (empty workspace).

## 3. Existing implementation inventory
| Area | Status |
|---|---|
| Next.js app / routes / API routes / Server Actions | Not present |
| Tailwind / shadcn config | Not present |
| Firebase client / Admin / Auth / Firestore / Storage | Not present |
| Firestore + Storage rules | Not present |
| Redux Toolkit setup | Not present |
| Dashboard / POS / marketing site | Not present |
| Tests | Not present |
| Build / runtime errors | Not applicable |

## 4. Missing modules
Everything in the master prompt: all 21 prompt sections. See roadmap (section 9) for ordering.

## 5. Security risks to design out from day one
1. **Client-supplied tenantId trust.** Resolve tenant only from verified server-side membership
   (session cookie -> uid -> `tenants/{tenantId}/members/{uid}`), never from request body alone.
2. **Client-writable financial data.** Sales, payments, stock, transactions, audit logs must be
   written only by trusted server code (Admin SDK) inside Firestore transactions; rules deny client writes.
3. **Role/claim escalation.** Platform admin must be assigned only by bootstrap script / existing admin.
   No self-service path writes `platformAdmins`.
4. **Admin SDK in client bundle.** Isolate with `server-only` import guard.
5. **Custom-claims bloat/staleness.** Multi-tenant users cannot keep all roles in claims (size limit,
   stale until refresh). Authoritative role lives in membership docs; claims only carry coarse flags.
6. **Rules `get()` cost and fragility.** Membership lookups in rules cost reads and are easy to get
   wrong; every collection needs emulator tests for cross-tenant denial.
7. **PII exposure.** Customers, trade-in sellers (ID documents), IMEI/device history. Field-level
   separation (sensitive subdocument with stricter rules), Storage paths per tenant, signed URLs.
8. **AI data leakage.** Gemini gets only results of tenant-scoped server tools, never Firestore
   credentials; prompt-injection from stored text (customer notes, product names) treated as data;
   sensitive actions need explicit human approval.
9. **Idempotency gaps** on sales, payments, offline sync: duplicate charges/stock deductions.
10. **Customer portal and storefront.** Public/semi-public surfaces need expiring tokens, rate limits,
    App Check; storefront reads must expose only public-safe product fields.
11. **Secrets.** Admin key, Gemini key, WhatsApp provider tokens only in server env; `.env.example` has names only.
12. **Audit log tampering.** Append-only, server-written, no client update/delete.
13. **Webhook / cron endpoints** (WhatsApp, scheduled jobs) must verify signatures / shared secrets.

## 6. Firebase schema recommendations (summary)
Full draft in `FIRESTORE_SCHEMA.md`. Key recommendations:
- Money as **integers in minor units** (paisa) plus currency code; never floats.
- Embed bounded line items inside `sales`/`purchases` documents instead of separate item collections
  (atomic read/write, fewer reads); keep separate item collections only if proven needed.
- **IMEI uniqueness:** use a deterministic document ID (the IMEI) per tenant so uniqueness is enforced by
  the database. This deviates from "automatic IDs" rule; flagged as a decision for you.
- Stock as one doc per (variant, branch) updated only by transactions, with append-only `stockMovements`
  as the audit trail.
- Daily/branch aggregate docs for dashboards (avoid scanning all sales).
- Sequential invoice numbers via per-branch counter doc in a transaction (watch contention).
- Avoid monotonically increasing document IDs on hot collections.

## 7. Recommended target folder structure
See `TARGET_FOLDER_STRUCTURE.md` (adapts the master-prompt tree; creates folders only when their phase starts).

## 8. Dependency compatibility report
See `DEPENDENCY_COMPATIBILITY.md`. Nothing installed.

## 9. Phase-by-phase roadmap (with recommended adjustments)
Keep your Phase 1-20 order, with these suggestions:

| Suggestion | Why |
|---|---|
| Add a **plan/entitlement skeleton** to Phase 2 | Server-side entitlement checks should exist before modules are built, else retrofitting touches every route. |
| Decide **idempotency-key + operation-ID format** in Phase 2 | POS (Phase 8), offline (Phase 16) and sync all depend on it. |
| Write **rules + emulator tests per collection inside each phase** | Not only in Phase 19; isolation bugs are cheapest to fix when introduced. |
| Seed **Smart Mobile Hub as clearly labelled demo data** in Phase 5 | Needed to test dashboards; label per your rules. |
| Keep **3D hero for Phase 18** but pick brand tokens in Phase 1 | Avoids redesigning later. |
| Split Phase 8 (POS/returns/exchanges) in two approvals if large | POS calculations and returns/exchanges carry the most financial risk. |

Each phase ends with: modified files, test results, limitations, then waits for your approval.

## 10. Implementation risks
- **Scope**: this is a multi-year-sized product; phase gating is essential. Largest risks are POS financial
  correctness, tenant isolation, and offline sync.
- **Firebase plan constraints [VERIFY]**: server functions/scheduled jobs and some Storage setups may require a
  paid plan. Your rule is no billing without approval, so cron/webhooks need a plan (hosting choice for
  Next.js route handlers, Cloud Scheduler alternative) decided before Phase 2.
- **Firestore limits**: 1 write/sec sustained per document (hot counters), transaction contention on busy
  stock/invoice docs, 1 MiB document size, no native full-text search (product search needs prefix
  queries, a search index, or client-side filtering of a cached catalogue).
- **Rules complexity**: multi-role, multi-branch rules get long; generate from a shared permission matrix
  and test exhaustively.
- **3D performance** on low-end Android phones (your actual market): ship static fallbacks, lazy load, measure.
- **Urdu/RTL** support affects layout from Phase 1 (logical CSS properties, font choice); retrofitting is costly.
- **WhatsApp / JazzCash / Easypaisa / PTA**: no integration may be claimed until an authorized provider
  is chosen and tested; modules ship as "records + integration-ready", per your rules.
- **Gemini integration**: model names and SDK change often **[VERIFY]**; wrap behind one server adapter.

## 11. Decisions needed from you before Phase 1
1. Repo location: new Next.js project (greenfield) or an existing repo to attach?
2. Use `src/` directory (as in your tree)? Recommended: yes.
3. Is IMEI-as-document-ID acceptable (deviation from auto IDs)?
4. Hosting target for Next.js server code (Vercel, Firebase App Hosting, other) — affects billing, cron, webhooks.
5. Languages at launch: English only first, or English + Urdu (RTL) from Phase 1?
6. Tailwind major version preference (verify shadcn compatibility at install time).

## 12. Approval
**Do you approve starting Phase 1 (Foundation and Design System)?** Phase 1 would scaffold the Next.js JSX
project, install only the Phase 1 dependencies after a live compatibility check, set up Tailwind/shadcn,
design tokens, Redux provider shell and the shared layout/navigation. No Firebase work yet.
