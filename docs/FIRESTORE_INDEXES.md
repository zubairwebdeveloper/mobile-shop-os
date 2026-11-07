# FIRESTORE_INDEXES.md — DRAFT (Phase 0)

Not deployed. Single-field indexes are automatic; below are **expected composite indexes** inferred from
planned query patterns. Finalize from real queries in each phase and encode in `firestore.indexes.json`.
All collections are under `tenants/{tenantId}/` (collection scope unless noted).

| Collection | Query pattern | Composite index (order) |
|---|---|---|
| sales | Branch sales list, newest first | `branchId ASC, createdAt DESC` |
| sales | Sales by status in a date range | `status ASC, createdAt DESC` |
| sales | Customer purchase history | `customerId ASC, createdAt DESC` |
| sales | Employee performance | `soldBy ASC, createdAt DESC` |
| stockMovements | Movement history per variant/branch | `variantId ASC, branchId ASC, createdAt DESC` |
| inventory | Low-stock list per branch | `branchId ASC, status ASC` (low-stock flag maintained by server) |
| imeiRecords | Devices by status per branch | `branchId ASC, status ASC, updatedAt DESC` |
| imeiRecords | Devices by supplier | `supplierId ASC, createdAt DESC` |
| productVariants | Catalogue by product | `productId ASC, status ASC` |
| products | Filter by category + status | `categoryId ASC, status ASC, name ASC` |
| purchases | Supplier purchase history | `supplierId ASC, createdAt DESC` |
| purchases | Open purchase orders | `status ASC, createdAt DESC` |
| customers | VIP / segment lists | `segment ASC, lifetimeValue DESC` |
| installmentPlans | Overdue list | `status ASC, nextDueDate ASC` |
| installmentPlans | Customer plans | `customerId ASC, createdAt DESC` |
| warranties | Expiring soon | `status ASC, expiresAt ASC` |
| repairJobs | Board by status per branch | `branchId ASC, status ASC, updatedAt DESC` |
| repairJobs | Technician queue | `technicianId ASC, status ASC` |
| expenses | Branch expenses by date | `branchId ASC, date DESC` |
| transactions | Ledger by branch/date | `branchId ASC, createdAt DESC` |
| onlineOrders | Orders by status | `status ASC, createdAt DESC` |
| messages | Outbox processing | `status ASC, scheduledAt ASC` |
| auditLogs | By actor / entity | `actorUid ASC, createdAt DESC`; `entityType ASC, entityId ASC, createdAt DESC` |
| aggregates | Date range per branch | `branchId ASC, date ASC` |

**Collection-group indexes (only if needed):** `members` by `uid` (to find a user's tenants) — avoided by
the `userTenants/{uid}/memberships` reverse index.

## Query design notes
- No full-text search in Firestore. Product/IMEI search: exact/prefix on `searchTokens`/`imei`, or a
  cached local catalogue for POS. External search service is out of scope until approved.
- Dashboards read `aggregates`, not raw `sales`.
- Avoid `!=`/`not-in` heavy queries; model status as enums.
- Avoid unbounded listeners; paginate with cursors.
- Review each index for write cost; remove unused ones.
