# Phase 11 Report: Employee and Branch Operations

## Delivered
Staff records with account linking; daily attendance sheet with monthly summary; leave requests with approval; monthly sales targets; staff and branch performance; commission preview, finalise and mark-paid; owner-only activity history; nav items (Employees, Performance); tests; docs.

## Changed from earlier phases
- `firestore.rules`: `employees` read is now branch-scoped for owner/manager (before: owner/manager of any branch). Deploy rules.
- `nav-config.js`, `firestore.indexes.json`, `docs/API_DOCUMENTATION.md` extended.

## NOT delivered
- No payroll, salary, advances, deductions or payslips. No leave balances or public holidays. No staff self-service (check-in, own leave requests, own targets). No shift roster. No automatic penalty for late arrival.
- No commission on profit or per-product rates; no adjustment of a finalised month.
- No AI performance insights or anomaly detection (Phase 13).
- Customer portal (Phase 9b) is still pending.

## Verification (honest)
| Check | Result |
|---|---|
| Unit tests (staff rules, validations) | 13 new passed under Bun |
| Syntax parse and `@/` import/export resolution of all new files | 0 errors |
| Firestore rules test (employees by branch, server-only collections) | written, **not run** (no emulator) |
| Integration tests (link, attendance, leave, credit and returns, commission) | written, **not run** (no emulator) |
| Lint, `next build`, UI in a browser | **not run** (no npm registry) |

Phases 8 to 11 UI have never been rendered. Please run the setup scripts of Phases 7, 8, 9, 10, 11 in order and send me the output; I will fix whatever fails before building more.

## Known limits
- Reports read live documents (no stored aggregates); same caps as Finance (3000 sales, 2000 returns/repairs).
- A person who changes branch keeps old attendance under the old branch.
- Attendance for the attendance-rate branch column counts records only; unmarked days are ignored.
- If a team account is removed from Team, its employee link stays until you edit the employee.
