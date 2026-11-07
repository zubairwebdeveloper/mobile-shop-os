# Inventory and Purchases (Phase 7)

## Stock model
- `inventory/{variantId_branchId}` holds `quantity` per variant per branch. Clients can only read it; the server writes it inside transactions.
- **IMEI-tracked products:** quantity = number of devices with status `IN_STOCK` at that branch. It changes only when devices are registered, change status, move branch, are received on a purchase, or travel on a transfer. Manual adjustment is refused (`USE_IMEI_STATUS`).
- **Other products:** quantity changes through purchase receiving, adjustments and transfers.
- Quantity can never go below zero (`INSUFFICIENT_STOCK`); concurrent removals are serialised by Firestore transactions.
- `stockMovements` is append-only: type, quantity change, quantity after, actor, reference (purchase / transfer / adjustment).
- RESERVED, DAMAGED, IN_REPAIR and IN_TRANSIT devices are not counted as in stock.

## Suppliers
Name must be unique per shop (case-insensitive). Suppliers are archived (active=false), not deleted.

## Purchase orders
`DRAFT -> ORDERED -> PARTIALLY_RECEIVED -> RECEIVED`, and `CANCELLED` from DRAFT/ORDERED. Numbers `PO-000001...` come from a transactional counter. Items are embedded in the purchase document (max 50 lines) so the order and its received quantities change atomically.

## Receiving
Each receipt carries a client-generated `receiptKey`; a receipt document `purchases/{id}/receipts/{key}` makes retries and double-clicks safe. Over-receipt is refused. For IMEI-tracked lines you enter exactly one IMEI row per unit (max 40 units per action); each becomes an `IN_STOCK` device linked to the supplier and purchase, with the unit cost. IMEIs are checked for format (15 digits, Luhn) and uniqueness only; this is **not** PTA or manufacturer verification.

## Branch transfers
Create deducts the source immediately (devices become `IN_TRANSIT`). Receive (destination branch) adds stock / sets devices `IN_STOCK` at the destination. Cancel (source branch) returns everything. A device can be on one open transfer only.

## Low stock
Computed live: variants whose quantity across the caller's branches is at or below `minStock`. Shown on the dashboard tile and Notifications page.

## Indexes
Deploy the updated `firestore.indexes.json` (adds `stockMovements: branchId ASC, createdAt DESC`) before using branch-scoped movement history.

## Existing devices
Devices registered in Phase 6 are not counted until an owner runs **recount** (`POST .../inventory/recount`).
