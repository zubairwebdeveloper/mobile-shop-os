# FIRESTORE_SCHEMA.md — DRAFT (Phase 0, not created in any database)

Nothing here has been created in Firestore. This is a design proposal to be finalized in Phase 2.

## Conventions
- **Money**: integer minor units (paisa) + `currency` (default `PKR`). No floats.
- **Timestamps**: server timestamps (`createdAt`, `updatedAt`); dates for business logic stored as ISO date strings in the shop timezone where day-bucketing matters.
- **Ownership**: every tenant document lives under `tenants/{tenantId}/...`; branch-owned docs carry `branchId`. Tenant ID is the path, so it cannot be spoofed by a field value.
- **Actors**: `createdBy`, `updatedBy` (uid).
- **IDs**: auto IDs by default. Exceptions (decision needed): `imeiRecords/{imei}` deterministic ID for DB-enforced uniqueness; `members/{uid}`.
- **Soft delete**: `status`/`deletedAt` instead of hard delete for business records.
- **Writes**: financial and stock collections are **server-only** (Admin SDK, transactions). Client rules are read-only for authorized roles.
- **Idempotency**: server writes accept `operationId`; stored in `operations/{operationId}` to reject duplicates.

## Platform level
| Path | Purpose | Writers |
|---|---|---|
| `platformUsers/{uid}` | Profile, email verified flag, default tenant | server |
| `platformAdmins/{uid}` | Super admin marker + level | bootstrap script only |
| `tenantApplications/{applicationId}` | Shop application: `PENDING/APPROVED/REJECTED`, applicantUid, shop details, reviewedBy | user creates own (PENDING); admin server reviews |
| `platformPlans/{planId}` | Plan definitions, limits, feature flags (pricing page reads this) | platform admin via server |
| `platformSettings/{id}` | System settings | platform admin via server |
| `platformAuditLogs/{id}` | Append-only | server |
| `userTenants/{uid}/memberships/{tenantId}` | Reverse index: which tenants a user belongs to (tenant switcher) | server |

## Tenant root: `tenants/{tenantId}`
Fields: `name`, `slug`, `status` (`ACTIVE/SUSPENDED`), `ownerUid`, `planId`, `branding` (map), `settings` (currency, timezone, tax/GST, locale, invoice template), `limits` snapshot, `createdAt`.
Subscription detail in `tenants/{tenantId}/billing/subscription` (status, trial end, renewal, history subcollection).

## Tenant subcollections
| Collection | Notes |
|---|---|
| `members/{uid}` | `role` (OWNER, MANAGER, CASHIER, TECHNICIAN, ...), `branchIds[]`, `status`, permission overrides. **Authoritative role source.** |
| `invitations/{id}` | Email, role, branchIds, expiry, token hash |
| `branches/{branchId}` | Name, address, active, settings |
| `categories/{id}`, `brands/{id}` | Configurable catalogue taxonomy |
| `products/{productId}` | Model-level info, specs, images, tracking mode (`IMEI`/`QTY`), min stock |
| `productVariants/{variantId}` | `productId`, storage/RAM/color, SKU, barcode, prices (purchase/retail/wholesale) |
| `inventory/{variantId_branchId}` | Deterministic ID; `onHand`, `reserved`, `damaged`, `avgCost`; **server-only** |
| `imeiRecords/{imei}` | `imei2?`, serial, variantId, status (`IN_STOCK/SOLD/RESERVED/REPAIR/RETURNED/TRADE_IN`), branchId, supplierId, purchaseId, saleId, condition, warrantyId, history events; **server-only** |
| `stockMovements/{id}` | Append-only ledger: type, variantId, branchId, qty delta, ref (sale/purchase/transfer/adjustment), operationId |
| `stockTransfers/{id}` | From/to branch, status workflow |
| `suppliers/{id}` | Contact, balance cache |
| `purchases/{id}` | Header + embedded `items[]` (bounded), status, supplier invoice no., totals |
| `sales/{id}` | Header + embedded `items[]` (variant, qty, imei, unit price, cost snapshot, discount, tax), `payments[]`, status, invoiceNo, customerId, branchId, operationId; **immutable after finalisation** — changes via `returns`/`exchanges`/corrections |
| `returns/{id}`, `exchanges/{id}` | Reference original sale, approval, stock + financial effect |
| `customers/{id}` | Contact, tags, consent flags, balance cache; sensitive fields in `customers/{id}/private/profile` |
| `payments/{id}` | Customer/supplier/installment payments; method (CASH, BANK, JAZZCASH, EASYPAISA), reference no. (records only, no provider integration) |
| `transactions/{id}` | Append-only financial ledger; corrections are new reversing entries |
| `expenses/{id}` | Category, branch, amount |
| `installmentPlans/{id}` | Sale ref, down payment, schedule[] (due date, amount, paid) |
| `warranties/{id}`, `warrantyClaims/{id}` | Linked to imei/sale/customer |
| `repairJobs/{id}` | Status enum from prompt; embedded `parts[]`, timeline events |
| `tradeIns/{id}` | Inspection checklist, grade, valuation, seller PII in private subdoc, resulting imeiRecord |
| `employees/{id}`, `attendance/{id}`, `commissions/{id}` | HR; salary fields restricted |
| `loyaltyAccounts/{customerId}`, `loyaltyTransactions/{id}` | Points ledger append-only |
| `coupons/{id}` | Rules, limits |
| `onlineOrders/{id}` | Storefront orders; reserved stock via transactions |
| `notifications/{id}` | In-app notifications |
| `messages/{id}` | WhatsApp outbox/status (`QUEUED`, `NOT_CONFIGURED`, ... never "SENT" without provider confirmation), consent/opt-out in customer doc |
| `supportTickets/{id}` | Customer and internal |
| `reviews/{id}` | Real reviews only |
| `aiInsights/{id}`, `aiUsage/{id}` | Insight with data range + source refs; usage counters |
| `integrations/{id}` | Config; secrets NOT stored here (server env/secret manager) |
| `aggregates/daily_{branchId}_{yyyymmdd}` | Server-maintained: revenue, cost, gross profit, refunds, counts — powers dashboards |
| `counters/{name}` | Invoice number counters per branch |
| `operations/{operationId}` | Idempotency records |
| `auditLogs/{id}` | Append-only |

## Considered and changed from the master prompt list
- `saleItems`, `purchaseItems`, `repairParts`: embedded as bounded arrays (revisit if a sale can exceed ~100 lines or analytics need per-item queries; then add a collection-group-friendly `lines` subcollection written server-side).
- Added: `invitations`, `brands`, `stockTransfers`, `warrantyClaims`, `tradeIns`, `messages`, `aggregates`, `counters`, `operations`, `userTenants`, `platformPlans`.

## Access model (rules outline, Phase 2)
- Helper: `isMember(tenantId)`, `hasRole(tenantId, roles)`, `inBranch(tenantId, branchId)` via `get(/tenants/$(tenantId)/members/$(request.auth.uid))`.
- Default deny. Client writes allowed only to a small allow-list (profile fields, own application, drafts). All money/stock paths: `allow write: if false`.
- Customer portal and storefront use server endpoints returning scoped DTOs (no direct client Firestore access to tenant data).
- Storage paths `tenants/{tenantId}/...` with membership checks; trade-in ID documents in a stricter path.

## Open questions
1. IMEI as document ID (recommended) vs auto ID + unique index doc?
2. Retention policy for audit logs and PII.
3. Customer identity model: passwordless link/OTP vs Firebase Auth accounts.
