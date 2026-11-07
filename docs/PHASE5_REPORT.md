# Phase 5 report: Shop Dashboard

## Delivered
Real overview (branch/team counters, recent audit), branch selector, shop settings, team management (roles, status, branch
access), invitations (create/revoke/accept), shop audit log page, navigation updates (Team, Audit logs, Settings live).
See `SHOP_DASHBOARD.md` and `API_DOCUMENTATION.md`.

## Verification status (be honest)
| Check | Status |
|---|---|
| Unit tests (team rules, validations): 16 | Run in the build sandbox with Bun; passing |
| Syntax check of all new JS/JSX | Run; passing |
| Firestore rules tests (`team-rules.test.js`) | **Written, NOT run** (needs emulator) |
| Integration tests (`team.test.js`) | **Written, NOT run** (needs emulator) |
| `npm run lint`, `npm run build`, UI in browser | **NOT run** (sandbox cannot reach npm) |
`setup-phase5.sh` runs everything on your machine. Please send any failure output.

## Decisions I made (change if you disagree)
- OWNER role is not assignable; single owner per shop until an ownership-transfer feature exists.
- Invitations send no email (no mail provider chosen). The owner tells the person to register with that address.
- Timezone is a validated free-text IANA name (no curated list).
- Currency is shown but not editable (money logic assumes PKR in paisa).

## Not in this phase
Notifications (Phase 7), email sending, ownership transfer, tenant switcher UI for users in several shops, employee profiles/attendance (Phase 11).

## Replaced files
`components/navigation/{nav-config.js,AppHeader.jsx}`, `store/slices/branchSlice.js`, `(dashboard)/dashboard/{layout,page}.jsx`, `docs/API_DOCUMENTATION.md`.

## Next
Phase 6 (Products, catalogue, IMEI) after your approval.
