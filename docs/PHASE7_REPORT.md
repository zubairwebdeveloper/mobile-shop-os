# Phase 7 Report: Inventory and Purchases

## Delivered
Suppliers, branch stock, append-only stock movements, adjustments, purchase orders with partial/idempotent receiving (incl. IMEI units), branch transfers, low-stock tile and notifications page, IMEI stock recount, nav items, unit/rules/integration tests, docs.

## Verification (honest)
| Check | Result |
|---|---|
| Unit tests (inventory pure + validations) | 18 passed under Bun |
| Syntax parse of all new/changed JS/JSX | 0 errors |
| Firestore rules tests | written, **not run** (no emulator in my sandbox) |
| Integration tests | written, **not run** (no emulator) |
| Lint, `next build`, UI in browser | **not run** (no npm registry) |

`setup-phase7.sh` runs all of these on your machine; please send me its output.

## Files replaced (from earlier phases)
`src/lib/catalog/imei.js` (stock-aware, exports `stageNewImei`), `src/components/navigation/nav-config.js`, `src/app/(dashboard)/dashboard/page.jsx` (low-stock tile), `firestore.indexes.json`, `docs/API_DOCUMENTATION.md`.

## Deviations and limitations
- Purchase items are embedded in the purchase doc, not a separate `purchaseItems` collection (atomicity; 50-line cap).
- No costing method (no moving average); unit cost is recorded per line/device only.
- Overstock detection not implemented; damaged stock via adjustment reason or IMEI DAMAGED.
- Low stock is computed, not stored; Notifications shows only low-stock alerts.
- Scoped members' movement history is limited to 30 branches and needs the new index.
- Scoped managers can only choose destination branches they can list.
- Supplier payables are deferred to Phase 10.
- Still deferred from Phase 6: product images, CSV import/export, QR.

## Next
Phase 8 (POS and Sales) waits for your approval.
