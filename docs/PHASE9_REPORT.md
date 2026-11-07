# Phase 9 Report: Customers, Warranty and Repairs

## Delivered
Customer CRM with private details, POS customer picker, customer profile with history and balance; warranty registration, certificate, lookup, ending-soon list and claims; repair jobs with technician assignment, parts from stock, status history, warranty repairs and hand-over; nav items; tests; docs.

## NOT delivered (and why)
- **Customer self-service portal.** The brief lists it in this phase, but it needs a separate customer identity model (customer sign-in, linking an account to exactly one customer record, its own rules and tests, "customers must only access their own records"). Doing it in a hurry here would risk exposing records, so I left it out. Suggested as its own step (Phase 9b) after you review this one.
- Automatic warranty expiry reminders (needs messaging/consent, Phase 14); a manual "ending in 30 days" list is provided.
- Loyalty points, customer segmentation, AI insights (later phases).
- Repair income in finance reports and closing (Phase 10); customer repair tracking by the customer themselves (needs the portal).

## Verification (honest)
| Check | Result |
|---|---|
| Unit tests (CRM pure rules + validations) | 18 passed under Bun |
| Syntax parse of all new/changed JS/JSX | 0 errors; all `@/` imports resolve |
| Firestore rules tests | written, **not run** (no emulator in my sandbox) |
| Integration tests (customers, privacy, warranty, repairs, isolation) | written, **not run** (no emulator) |
| Lint, `next build`, UI in a browser | **not run** (no npm registry) |

`setup-phase9.sh` runs all of these on your machine; please send me its output. None of the UI from Phases 8 and 9 has been rendered yet.

## Files replaced (from earlier phases)
`src/lib/sales/sales.js` (optional `customerId`), `src/lib/validations/sales.js` (customerId), `src/features/sales/components/PosTerminal.jsx` (customer picker), `src/app/(dashboard)/dashboard/sales/[id]/page.jsx` (Register warranty card, customer link), `src/components/navigation/nav-config.js`, `firestore.indexes.json`, `docs/API_DOCUMENTATION.md`.

## Deviations and limitations
- Warranty claims and repair parts/history are embedded arrays (caps 20 / 30 / history), not separate collections (`repairParts` in the brief), for atomic stock changes.
- Customer history is capped at the latest 200 of each kind and limited to the viewer's branches, so a scoped cashier sees a partial balance.
- Warranty duration is entered per registration; products have no default warranty period yet.
- Customer search is name prefix or exact phone (no substring search).
- Repair intake cannot pick a saved customer from a list (typed name/phone, or via a warranty); linking to a customer record happens through warranty repairs.

## Next
Phase 9b (customer portal) if you want it, or Phase 10 (Installments and Finance), waits for your approval.
