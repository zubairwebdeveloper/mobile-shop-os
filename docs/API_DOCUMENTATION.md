# API_DOCUMENTATION.md (through Phase 6)

All routes: Node runtime, JSON, `Cache-Control: no-store`. State-changing routes require a same-origin `Origin`
header. Errors: `{ "error": { "code": "...", "message": "..." } }`; unknown server errors are always a generic 500.

| Method + path | Auth | Purpose |
|---|---|---|
| `POST /api/auth/session` | Firebase ID token in body (`idToken`, sign-in < 5 min old) | Creates the httpOnly session cookie; upserts `platformUsers/{uid}`. Returns `{ ok, emailVerified }` |
| `DELETE /api/auth/session[?all=1]` | none needed | Clears the cookie. `all=1` also revokes the user's refresh tokens |
| `GET /api/tenants/{tenantId}/me` | active member | Caller's verified role, permissions and branch scope |
| `POST /api/onboarding/application` | verified session | Submit / resubmit the caller's shop application. Body: shopName, slug, ownerName, phone, city, address, expectedBranches. 201 `{ ok }` |
| `POST /api/platform/applications/{applicationId}/decision` | platform admin | Body `{ decision: "APPROVE" }` or `{ decision: "REJECT", reason }`. Approve returns `{ ok, tenantId }` |
| `GET /api/tenants/{tenantId}/branches` | active member | Branches the caller may see |
| `POST /api/tenants/{tenantId}/branches` | OWNER (`settings:write`) | Create branch (name, address, phone). 409 `BRANCH_LIMIT_REACHED` at the plan limit |
| `PATCH /api/tenants/{tenantId}/branches/{branchId}` | OWNER | Update name, address, phone |
| `POST /api/platform/tenants/{tenantId}/status` | platform admin | Body `{ action: "SUSPEND", reason }` or `{ action: "REACTIVATE" }`. 409 `INVALID_STATE` for wrong transitions |
| `POST /api/platform/tenants/{tenantId}/subscription` | platform admin | Body `{ planId, status: TRIAL/ACTIVE/PAST_DUE/CANCELLED, renewsAt: "YYYY-MM-DD" or "", note }`. Copies plan limits to the shop. 409 `PLAN_UNAVAILABLE`, `DOWNGRADE_BLOCKED` |
| `POST /api/platform/plans` | platform admin | Create plan (id, name, price in whole PKR or empty, limits, features, visibility). 409 `PLAN_EXISTS` |
| `PATCH /api/platform/plans/{planId}` | platform admin | Update plan (id cannot change). Existing shops keep their limits snapshot |
| `PATCH /api/tenants/{tenantId}/settings` | OWNER (`settings:write`) | Body: name, phone, city, address, timezone (IANA). Also renames the shop in members' switcher index |
| `GET /api/tenants/{tenantId}/members` | OWNER (`members:manage`) | Team list |
| `PATCH /api/tenants/{tenantId}/members/{uid}` | OWNER | Body: role (not OWNER), status ACTIVE/DISABLED, allBranches, branchIds. Owner and own row locked (409 `MEMBER_LOCKED`) |
| `GET/POST /api/tenants/{tenantId}/invitations` | OWNER | Create invitation: email, role, allBranches, branchIds. No email is sent yet |
| `DELETE /api/tenants/{tenantId}/invitations/{invitationId}` | OWNER | Revoke a pending invitation (other shops' ids look like 404) |
| `POST /api/invitations/accept` | verified session | Body `{ invitationId }`. Only the invited email can accept. Returns `{ ok, tenantId }` |
| `GET/POST /api/tenants/{t}/categories`, `PATCH .../categories/{id}` | read: `catalog:read`, write: `catalog:write` (owner, manager) | name, tracksImei, active. 409 `NAME_TAKEN`, `TOO_MANY_PRODUCTS` |
| `GET/POST /api/tenants/{t}/brands`, `PATCH .../brands/{id}` | same | name, active. Rename updates products' `brandName` |
| `GET/POST /api/tenants/{t}/products`, `GET/PATCH .../products/{productId}` | same | name, brandId, categoryId, description, specs, barcode, status. 409 `BRAND_UNAVAILABLE`, `CATEGORY_UNAVAILABLE`, `BARCODE_TAKEN` |
| `POST /api/tenants/{t}/products/{productId}/variants`, `PATCH .../variants/{variantId}` | `catalog:write` | storage, ram, color, sku, barcode, prices in whole PKR (stored as paisa), minStock, status |
| `GET /api/tenants/{t}/imei[?q=]` | `inventory:read` | Devices in the caller's branches only |
| `POST /api/tenants/{t}/imei` | `inventory:adjust` + branch access | variantId, branchId, imei1, imei2?, serialNumber, condition, purchasePrice, notes. 409 `IMEI_EXISTS`, `NOT_IMEI_TRACKED`, `VARIANT_ARCHIVED`, `PRODUCT_ARCHIVED` |
| `GET/PATCH /api/tenants/{t}/imei/{id}` | read `inventory:read`, write `inventory:adjust` | Other branches' devices look like 404. 409 `IMEI_LOCKED` once SOLD/RETURNED |
| `GET /api/tenants/{t}/lookup?code=` | `catalog:read` | Finds product, variant or device by barcode, SKU or IMEI inside the shop. 400 for malformed codes |
| `GET/POST /api/tenants/{t}/suppliers`, `PATCH .../suppliers/{id}` | read/write: `purchases:read` / `purchases:write` | name, phone, city, address, notes, active. 409 `NAME_TAKEN` |
| `GET /api/tenants/{t}/inventory[?branchId=]` | `inventory:read` | Stock rows for the caller's branches only |
| `POST /api/tenants/{t}/inventory/adjust` | `inventory:adjust` + branch access | variantId, branchId, delta (non-zero integer), reason, note. 409 `INSUFFICIENT_STOCK`, `USE_IMEI_STATUS` (IMEI-tracked products change through device status) |
| `POST /api/tenants/{t}/inventory/recount` | `inventory:adjust`, all-branch member | Rebuilds IMEI-product stock counters from devices. Returns `{ changed }` |
| `GET /api/tenants/{t}/stock-movements[?cursor=&limit=]` | `inventory:read` | Append-only history, newest first, cursor pagination |
| `GET/POST /api/tenants/{t}/purchases` | `purchases:read` / `purchases:write` + branch access | Create: supplierId, branchId, note, items[{variantId, quantity, unitCost (whole PKR)}] (max 50). Number `PO-000001` from a counter. 409 `SUPPLIER_UNAVAILABLE`, `PHONE_TAKEN`, `ALREADY_REGISTERED`, `ALREADY_RETURNED`, `WARRANTY_NOT_ACTIVE`, `TOO_MANY_CLAIMS`, `INVALID_TRANSITION`, `TECHNICIAN_UNAVAILABLE`, `PART_NOT_STOCKED`, `TOO_MANY_PARTS`, `DISCOUNT_TOO_LARGE`, `TOTAL_ZERO`, `OVERPAYMENT`, `CUSTOMER_REQUIRED`, `EXCHANGE_CREDIT_LOW`, `EXCHANGE_REQUIRED`, `BAD_METHOD`, `BAD_AMOUNT`, `DUPLICATE_METHOD`, `TOO_MANY_PAYMENTS`, `KEY_REUSED`, `NOT_ON_SALE`, `OVER_RETURN`, `IMEI_NOT_ON_SALE`, `ALREADY_CLOSED`, `TOO_MANY_RECORDS`, `ITEM_UNAVAILABLE` |
| `GET/POST /api/tenants/{t}/purchases/{id}` | read / write | POST body `{ action: "ORDER" \| "CANCEL" }`. 409 `INVALID_STATE` |
| `POST /api/tenants/{t}/purchases/{id}/receive` | `purchases:write` | Body `{ receiptKey, lines[{variantId, quantity, imeis[{imei1, imei2}]}] }`. Same `receiptKey` is applied once. 409 `OVER_RECEIPT`, `IMEI_COUNT`, `DUPLICATE_IMEI`, `IMEI_EXISTS`, `NOT_ON_PURCHASE`, `INVALID_STATE` |
| `GET/POST /api/tenants/{t}/transfers` | `inventory:read` / `inventory:adjust` | Create: fromBranchId, toBranchId, note, items[{variantId, quantity, imeis[]}]. Deducts source stock at once. 409 `SAME_BRANCH`, `INSUFFICIENT_STOCK`, `IMEI_NOT_FOUND`, `IMEI_NOT_AVAILABLE` |
| `POST /api/tenants/{t}/transfers/{id}` | `inventory:adjust` | `{ action: "RECEIVE" }` (destination branch) or `{ action: "CANCEL" }` (source branch). 409 `INVALID_STATE` |
| `GET /api/tenants/{t}/pos/catalog?branchId=` | `sales:create` + branch access | Sellable variants (active, with a selling price) with that branch's stock |
| `GET /api/tenants/{t}/pos/imeis?branchId=&variantId=` | `sales:create` + branch access | In-stock devices of a variant at the branch |
| `GET /api/tenants/{t}/exchange-credits` | `sales:create` | Open exchange credit in the caller's branches |
| `GET /api/tenants/{t}/sales[?cursor=]` | `sales:read` | Invoices newest first, caller's branches only, cursor pagination |
| `POST /api/tenants/{t}/sales` | `sales:create` + branch access | Body: saleKey, branchId, customerName, customerPhone, note, taxPercent, orderDiscount (whole PKR), items[{variantId, quantity, discount, imeis[]}] (max 50), payments[{method: CASH/BANK_TRANSFER/JAZZCASH/EASYPAISA/EXCHANGE_CREDIT, amount (whole PKR), reference, exchangeId?}]. **Prices are taken from the catalogue, never from the request.** Same `saleKey` returns the first sale (200, `duplicate: true`). 409 `INSUFFICIENT_STOCK`, `ITEM_UNAVAILABLE`, `IMEI_COUNT`, `IMEI_NOT_AVAILABLE`, `IMEI_NOT_FOUND`, `IMEI_NOT_TRACKED`, `DUPLICATE_IMEI`, `DISCOUNT_TOO_LARGE`, `TOTAL_ZERO`, `OVERPAYMENT`, `CUSTOMER_REQUIRED`, `EXCHANGE_CREDIT_LOW`, `KEY_REUSED` |
| `GET /api/tenants/{t}/sales/{id}` | `sales:read` | One invoice. Other branches' and other shops' ids look like 404 |
| `GET /api/tenants/{t}/returns[?cursor=]` | `sales:read` | Return / refund records |
| `POST /api/tenants/{t}/returns` | `sales:refund-approve` (owner, manager) + sale's branch | Body: returnKey, saleId, reason, note, refundMethod (incl. EXCHANGE_CREDIT), reference, items[{variantId, quantity, restock, imeis[]}]. Idempotent per `returnKey`. 409 `OVER_RETURN`, `NOT_ON_SALE`, `IMEI_COUNT`, `IMEI_NOT_ON_SALE` |
| `GET/POST /api/tenants/{t}/daily-closings` | read `sales:read`, write `sales:create` + branch access | Body: branchId, date (YYYY-MM-DD, shop timezone), openingCash, countedCash, note. 409 `ALREADY_CLOSED`, `TOO_MANY_RECORDS` |
| `GET /api/tenants/{t}/customers[?q=&limit=]` | `customers:read` | Search by name prefix or phone (exact). Empty `q` = first 200 by name |
| `POST /api/tenants/{t}/customers` | `customers:write` | name, phone, email, city, address, notes, vip, marketingConsent. 409 `PHONE_TAKEN`. email/address/notes live in a private sub-document; `vip` is honoured only for owner/manager |
| `GET /api/tenants/{t}/customers/{id}` | `customers:read` | Profile, stats (purchases, lifetime value net of refunds, outstanding balance), purchases, devices, warranties, repairs (viewer's branches only). `private` is returned only with `customers:private-read` |
| `PATCH /api/tenants/{t}/customers/{id}` | `customers:write` | Same body + status (ACTIVE/ARCHIVED). Private fields, VIP and status change only for owner/manager. 409 `PHONE_TAKEN` |
| `GET /api/tenants/{t}/warranties[?lookup=&expiring=&cursor=]` | `customers:read` | `lookup` = IMEI or customer phone; `expiring` = days (max 90); otherwise newest first |
| `POST /api/tenants/{t}/warranties` | `customers:write` + sale's branch | saleId, months (1-60), startDate, terms, items[{variantId, imeis[]}]. One warranty per unit. 409 `ALREADY_REGISTERED`, `NOT_ON_SALE`, `IMEI_NOT_ON_SALE`, `IMEI_COUNT`, `ALREADY_RETURNED` |
| `GET /api/tenants/{t}/warranties/{id}` | `customers:read` | Certificate data and claims; `state` is ACTIVE / EXPIRED / VOIDED (computed) |
| `POST /api/tenants/{t}/warranties/{id}` | `CLAIM_ADD`: `customers:write`; `VOID`, `CLAIM_UPDATE`: `sales:refund-approve` | `{action, ...}`. 409 `WARRANTY_NOT_ACTIVE`, `INVALID_STATE`, `TOO_MANY_CLAIMS` |
| `GET /api/tenants/{t}/repairs[?cursor=]` | `repairs:read` | Jobs newest first, caller's branches |
| `POST /api/tenants/{t}/repairs` | `repairs:write` + branch access | branchId, customerId?, customerName, customerPhone, deviceBrand, deviceModel, imei?, issue, accessories, estimatedCost, warrantyId? (active warranty makes the job free). 409 `WARRANTY_NOT_ACTIVE` |
| `GET /api/tenants/{t}/repairs/{id}` | `repairs:read` | One job |
| `POST /api/tenants/{t}/repairs/{id}` | `repairs:write` | `{action: UPDATE \| STATUS \| ADD_PART \| REMOVE_PART, ...}`. 409 `INVALID_TRANSITION`, `INVALID_STATE`, `TECHNICIAN_UNAVAILABLE`, `PART_NOT_STOCKED`, `INSUFFICIENT_STOCK`, `TOO_MANY_PARTS`, `CUSTOMER_REQUIRED`, `OVERPAYMENT` |
| `POST /api/tenants/{t}/sales` (changed) | `sales:create` | New optional `customerId`: the customer's name/phone are copied onto the invoice and count as a named customer for credit sales. Archived/unknown customer: 404 |

| `GET/POST /api/tenants/{t}/installments` | read `sales:read`, write `sales:create` + branch access | POST: saleId, count (2-36), firstDueDate (not in the past), frequency MONTHLY/WEEKLY. One plan per sale; sale needs a saved customer and a balance; no interest. 409 `PLAN_EXISTS`, `CUSTOMER_REQUIRED`, `NOTHING_DUE`, `DATE_IN_PAST`, `BAD_COUNT`, `BALANCE_TOO_SMALL`. GET returns open plans, overdue first |
| `GET /api/tenants/{t}/installments/{saleId}` | `sales:read` | Plan with effective schedule, outstanding, overdue amount and days late |
| `GET/POST /api/tenants/{t}/payments` | read `sales:read`, write `sales:create` + branch access | POST: paymentKey, targetType SALE/REPAIR, targetId, amount (whole PKR), method CASH/BANK_TRANSFER/JAZZCASH/EASYPAISA, reference. Records money received; no gateway. Idempotent per `paymentKey` (200 `duplicate: true`). 409 `OVERPAYMENT`, `BAD_AMOUNT`, `INVALID_STATE`, `KEY_REUSED` |
| `GET /api/tenants/{t}/payments/{id}` | `sales:read` | Receipt (RCPT-000001) |
| `GET/POST /api/tenants/{t}/expenses` | `finance:read` / `finance:write` + branch access | POST: branchId, category, amount, date, method, paidTo, note |
| `PATCH /api/tenants/{t}/expenses/{id}` | `finance:write` | `{reason}` voids an expense (never deleted). 409 `ALREADY_VOID` |
| `GET /api/tenants/{t}/payables[?branchId=]` | `finance:read` | Owed to suppliers: received value minus payments, by purchase and supplier |
| `GET/POST /api/tenants/{t}/supplier-payments` | `finance:read` / `finance:write` | POST: paymentKey, purchaseId, amount, method, reference. 409 `OVERPAYMENT` |
| `GET /api/tenants/{t}/reports/finance?from=&to=[&branchId=]` | `finance:read` | Period (shop timezone, max 366 days): revenue, costs, gross profit, expenses, net profit, cash movement by method, by branch, plus current receivables/payables/overdue. 409 `TOO_MANY_RECORDS` |
| `GET/POST /api/tenants/{t}/reconciliations` | `finance:read` / `finance:write` | POST: method, from, to, branchId?, statementTotal (whole PKR, may be negative), note. Stores system net, statement total and difference |
| `GET /api/tenants/{t}/finance/export?type=expenses\|payments\|report&from=&to=` | `finance:read` | CSV download; formula-looking cells are neutralised |

| `GET/POST /api/tenants/{t}/employees` | `employees:read` / `employees:write` + branch access | POST: name, phone, designation, branchId, memberUid (optional team account), joinDate, commissionPercent (0 to 20), monthlyTarget (whole PKR), note. 409 `MEMBER_ALREADY_LINKED`, `MEMBER_UNAVAILABLE`, `EMPLOYEE_RECORD_LIMIT` |
| `GET/PATCH /api/tenants/{t}/employees/{id}` | read / write | GET adds `?month=YYYY-MM` attendance; recent activity only for `audit:read`. PATCH takes the full employee body plus status |
| `GET/POST /api/tenants/{t}/attendance` | read / write | GET `?branchId&date` day sheet. POST `{branchId, date, entries:[{employeeId,status,note}]}` (max 100). 409 `FUTURE_DATE`, `BEFORE_JOIN_DATE`, `EMPLOYEE_UNAVAILABLE`, `DUPLICATE_ENTRY` |
| `GET/POST /api/tenants/{t}/leave` | read / write | POST: employeeId, type, from, to, reason. 409 `LEAVE_OVERLAP`, `BAD_DATES` |
| `PATCH /api/tenants/{t}/leave/{id}` | `employees:write` | `{decision: APPROVED\|REJECTED\|CANCELLED, note}`. 409 `INVALID_TRANSITION` |
| `GET /api/tenants/{t}/performance?view=staff\|branch&from&to[&branchId]` | `employees:read` | Net sales per person or per branch. Max 366 days |
| `GET/POST /api/tenants/{t}/commissions` | read / write | GET `?month`. POST `{action: FINALIZE\|MARK_PAID, employeeId, month}`. 409 `MONTH_NOT_ENDED`, `NOT_LINKED`, `ALREADY_FINALIZED`, `INVALID_STATE` |

## Error codes
`UNAUTHENTICATED` 401 · `RECENT_SIGNIN_REQUIRED` 401 · `FORBIDDEN` 403 (also: not a member, suspended tenant,
wrong role; deliberately indistinguishable) · `NOT_FOUND` 404 · `BAD_REQUEST` / `INVALID_INPUT` 400 ·
`APPLICATION_EXISTS`, `MEMBERSHIP_EXISTS`, `SLUG_TAKEN`, `ALREADY_DECIDED`, `APPLICANT_NOT_VERIFIED`,
`APPLICANT_UNAVAILABLE`, `BRANCH_LIMIT_REACHED`, `INVALID_STATE`, `NAME_TAKEN`, `BARCODE_TAKEN`, `IMEI_EXISTS`, `NOT_IMEI_TRACKED`, `IMEI_LOCKED`, `BRAND_UNAVAILABLE`, `CATEGORY_UNAVAILABLE`, `VARIANT_ARCHIVED`, `PRODUCT_ARCHIVED`, `TOO_MANY_PRODUCTS`, `INSUFFICIENT_STOCK`, `USE_IMEI_STATUS`, `OVER_RECEIPT`, `IMEI_COUNT`, `DUPLICATE_IMEI`, `IMEI_NOT_FOUND`, `IMEI_NOT_AVAILABLE`, `SAME_BRANCH`, `SUPPLIER_UNAVAILABLE`, `ITEM_UNAVAILABLE`, `NOT_ON_PURCHASE`, `MEMBER_LOCKED`, `MEMBER_EXISTS`, `INVITATION_EXISTS`, `INVITATION_CLOSED`, `EMPLOYEE_LIMIT_REACHED`, `NO_VALID_BRANCH`, `TENANT_UNAVAILABLE`, `PLAN_EXISTS`, `PLAN_UNAVAILABLE`, `DOWNGRADE_BLOCKED` 409 · `INTERNAL` 500.
