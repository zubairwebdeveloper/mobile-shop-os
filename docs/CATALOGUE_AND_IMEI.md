# Catalogue and IMEI (Phase 6)

## Data model (all under `tenants/{tenantId}/`)
| Collection | Notes |
|---|---|
| `categories`, `brands` | `nameLower` for unique names; categories carry `tracksImei` |
| `products` | `brandName`/`categoryName` copied for fast lists (rename cascades, max 400 products); `variantCount` |
| `productVariants` | storage, RAM, colour, prices in **integer paisa**, `minStock` |
| `barcodes/{CODE}` | server-only claim: one namespace for product barcodes, variant barcodes and SKUs (upper-case) |
| `imeiRecords` | one per physical device; branch-scoped; subcollection `events` (history) |
| `imeiClaims/{imei}` | server-only claim: every IMEI 1/IMEI 2 is unique per shop |

## Decisions
- **IMEI uniqueness** uses claim documents written in the same transaction as the record, so two simultaneous registrations cannot both win and a number cannot be IMEI 1 on one device and IMEI 2 on another. Records have ordinary random IDs (this settles the Phase 0 "IMEI as document ID" question).
- **IMEI validation** = 15 digits + Luhn check digit (spaces/hyphens accepted). It proves the number is well formed only. **No PTA or manufacturer verification is claimed**, and none is integrated.
- **Branch isolation:** list, read, register and move all check the member's branch scope; another branch's device looks like 404.
- **Status** while manual: IN_STOCK, DAMAGED, RESERVED, IN_REPAIR. SOLD/RETURNED are set by later phases and lock the record against edits here.
- A device can be registered only for products whose category has IMEI tracking on.
- Registering a device does **not** change stock counts: inventory quantities arrive with Phase 7 (receiving will create IMEI records).
- Prices are entered in whole PKR and stored as paisa; the UI formats with a fixed `PKR 12,500` pattern (no locale differences).
- Permissions: catalogue read = every role; catalogue write = owner and manager; IMEI read = all roles in their branches; IMEI write = owner and manager.

## Barcode lookup
`/dashboard/imei` has a lookup box (type or scan with a USB scanner). 15 valid digits are treated as an IMEI first, otherwise as a barcode/SKU. Camera scanning is not included.
