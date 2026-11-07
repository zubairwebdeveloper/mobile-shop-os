# Customers, Warranty and Repairs (Phase 9)

## Customers (CRM)
- One customer per phone number per shop. Numbers are normalised (`0300 1234567`, `+92 300 1234567`, `3001234567` are the same) and claimed in `customerPhones/{number}` in the same transaction.
- Privacy: `customers/{id}` holds name, phone, city, VIP, marketing consent and status. Email, address and internal notes live in `customers/{id}/private/profile` and are read only by owner/manager (`customers:private-read`). Cashiers can create and edit customers but cannot see or overwrite private fields, change VIP, or archive. No CNIC or other ID numbers are collected.
- Marketing consent is an explicit tick box; it is stored for the later messaging phase and not used yet.
- The profile computes purchases, lifetime value (sales total minus refunds), outstanding balance (unpaid sale balances plus unpaid repair balances), devices bought (IMEIs) and recent history from the customer's sales, warranties and repair jobs, limited to the viewer's branches and the latest 200 of each.
- POS: pick a customer (search by name or phone) or type a one-off name + phone. A picked customer's name/phone are copied onto the invoice; archived customers cannot be picked.
- Not built: loyalty points, segmentation and AI insights (later phases), receiving payments against a balance (Phase 10).

## Warranty
- Registered from the invoice: choose the devices or lines, months (1-60), start date and terms. One warranty per sold unit (`{saleId}_{imeiRecordId or variantId}`), so duplicates are impossible even with two clicks at once. Returned units cannot be covered.
- Expiry date = start + months (day clamps to month end); the warranty is covered through that date. Expired is computed from the shop's local date, never stored.
- Certificate page prints through the browser. Lookup by IMEI or customer phone; "ending in 30 days" list.
- Claims: logged while active (customers:write); approved / rejected / resolved, or the warranty voided, by owner/manager. Claims are embedded (max 20).
- Not built: automatic expiry reminders (needs the messaging/notification phase and customer consent); the list above is the manual substitute.

## Repairs
- Flow: RECEIVED -> DIAGNOSING -> WAITING_FOR_PARTS / IN_PROGRESS -> READY -> DELIVERED, or CANCELLED. Invalid steps are refused; DELIVERED and CANCELLED are final. Every step is stored in the job history.
- Technician: only an active owner, manager or technician with access to the job's branch can be assigned.
- Parts: plain stocked items only (IMEI devices are refused). Adding a part takes stock; removing it or cancelling the job returns it (stock movements REPAIR_USE / REPAIR_RETURN).
- Hand-over: total = labour + parts. Amount collected is recorded with its method; an unpaid balance needs a linked customer and counts in that customer's outstanding balance. A job linked to an active warranty is free (final cost 0).
- Repair income is included in the finance report and daily closing from Phase 10.
- Jobs are created by roles with `repairs:write` (technician, manager, owner); a cashier can view jobs only.

## Permissions used
Customers and warranties read: `customers:read`. Create/edit customers, register warranty, log claim: `customers:write`. Void warranty, decide claims: `sales:refund-approve`. Repairs: `repairs:read` / `repairs:write`. Firestore rules are unchanged: `customers` and its private sub-document already existed; warranties and phone claims are denied to clients and read by the server. Repair jobs ARE readable by the client for owner, manager, cashier and technician in their own branches (never writable), so nothing business-private (such as part purchase cost) may be stored on a repair job; since Phase 10 part cost lives in the server-only `repairCosts` collection. (Phase 9 text and its rules test wrongly said repair jobs were closed; corrected in Phase 10.)

## Indexes
Deploy `firestore.indexes.json` (adds `warranties` and `repairJobs`: branchId ASC, createdAt DESC).
