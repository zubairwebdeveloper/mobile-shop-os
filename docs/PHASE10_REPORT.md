# Phase 10 Report: Installments and Finance

## Delivered
Installment plans with schedule, overdue tracking and partial payments; collections with receipts against credit sales and delivered repairs; expenses with void; supplier payables and payments; finance report (revenue, gross profit, net profit, cash movement, balances, by branch); reconciliation against a typed-in statement total; CSV export; daily closing now includes collections, repair cash, cash expenses and supplier cash; nav items; tests; docs.

## Fixes to earlier phases (please read)
- **Phase 9 rules test was wrong.** `crm-rules.test.js` expected owners to be refused reading `repairJobs`, but the Phase 2 rules allow owner/manager/cashier/technician to read jobs of their branch. Corrected in this package, plus a proper repair-jobs test. The Phase 9 doc line saying repair jobs were closed to clients is corrected too. I re-checked the Phase 7 and 8 rules tests against the real rules and found no other mismatch.
- Because repair jobs are client-readable, part purchase cost is stored in a server-only `repairCosts` document, not on the job.
- `returns.js` now also records `taxRefund` and `costReversed` on each return (needed for correct profit). `repairs.js` writes `repairCosts` on add/remove part. `closing.js` and `closingTotals` were extended (old inputs still give the old results; the Phase 8 tests still pass).

## NOT delivered
- No late fees or interest; no plan cancel/edit; one plan per sale.
- No bank/wallet integration or statement import (reconciliation is manual entry).
- No cash or bank **balance** (only movement), no payroll, no PDF export (CSV only), no scheduled overdue alerts or SMS/WhatsApp reminders (Phase 14), no customer-wide payment that spreads across several invoices.
- Customer portal (Phase 9b) is still pending.

## Verification (honest)
| Check | Result |
|---|---|
| Unit tests (finance rules, validations, closing) | 22 new passed under Bun, plus the 22 Phase 8 sales tests still pass |
| Syntax parse and `@/` import/export resolution for all new files | 0 errors |
| Firestore rules tests (finance, corrected CRM) | written, **not run** (no emulator) |
| Integration tests (plans, collections, expenses, payables, report, closing, returns cost) | written, **not run** (no emulator) |
| Lint, `next build`, UI in a browser | **not run** (no npm registry) |

None of the UI from Phases 8 to 10 has been rendered. Please run the setup scripts for Phases 7, 8, 9 and 10 in order and send me the output.

## Known limits
- Report totals are computed live from documents (no stored aggregates); caps listed in the docs.
- Cost of a restocked IMEI return is the sale's line cost pro rata, not that device's exact cost.
- Old repair parts (before Phase 10) have no recorded cost: flagged as unknown.
- Report period boundaries use the shop's current timezone setting.

## Files replaced from earlier phases
`src/lib/sales/{pure,returns,closing}.js`, `src/lib/repairs/repairs.js`, `src/app/(dashboard)/dashboard/sales/[id]/page.jsx`, `.../repairs/[id]/page.jsx`, `src/components/navigation/nav-config.js`, `firestore.indexes.json`, `tests/firestore-rules/crm-rules.test.js`, `docs/API_DOCUMENTATION.md`, `docs/CUSTOMERS_WARRANTY_REPAIRS.md`.
