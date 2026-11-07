# Installments, collections, expenses and finance (Phase 10)

## Money rules
Everything is integer paisa; screens take whole rupees. Installment amounts are whole rupees (leftover rupees go one each to the first installments).

## Installment plans
- One plan per credit sale (`installments/{saleId}`). The sale needs a saved customer (customerId) and an unpaid balance. A "down payment" is simply what the customer already paid at the till.
- Count 2 to 36, monthly or weekly. Monthly dates repeat from the first date and clamp to month end (31 Jan, 28 Feb, 31 Mar). **No interest, markup or late fees** are added.
- The sale's `dueAmount` is the truth. If a return cancels part of the debt, the LAST installments shrink.
- Overdue = an installment with an unpaid amount whose due date is before today in the shop's timezone. The Installments page lists open plans, overdue first, with days late.
- A plan cannot be edited after creation (create a new plan only if the old one is cancelled; cancelling plans is not built).

## Collections and receipts
- `POST /payments` records money received against a credit sale or a delivered repair (partial payments allowed, overpayment refused). It updates the balance, fills installments oldest-first, writes a numbered receipt (RCPT-000001) and an audit log in ONE transaction, and is idempotent per `paymentKey`.
- It is a **record**. Nothing is sent to JazzCash, Easypaisa or a bank.
- The original sale tenders and the repair hand-over amount are never rewritten, so period reports never count a payment twice.

## Expenses
Fixed categories (rent, salary, utilities, transport, marketing, maintenance, supplies, tax and fees, other). Never deleted: a wrong entry is voided with a reason and stops counting. Stock purchases are not expenses.

## Supplier payables
We owe a supplier for goods actually RECEIVED (received quantity x unit cost) minus payments (`purchase.paidAmount`). Ordered-but-not-received goods are not a debt. Payments are refused above what is owed.

## The finance report (never treats revenue as profit)
| Line | Meaning |
|---|---|
| Net sales | sales total minus tax, minus refunds (without their tax) |
| Repair revenue | final cost of jobs handed over in the period |
| Total revenue | net sales + repair revenue |
| Tax collected | shown separately; not revenue |
| Cost of goods sold | cost recorded at sale time; a return put back on the shelf reverses its cost, a damaged return does not |
| Repair parts cost | from the server-only `repairCosts` collection |
| Gross profit | total revenue - cost of goods - repair parts cost |
| Net profit | gross profit - active expenses |
| Cash movement | money in minus money out per method (sales tenders, collections, repair hand-over cash; refund payouts, expenses, supplier payments). Exchange credit is not cash. **Movement, not a balance.** |
| Owed now | receivables, supplier payables and overdue installments as of today |

If a sale or repair has no recorded cost, it is counted and flagged on the page; the cost is never guessed, so profit is then overstated. Returns made before Phase 10 have no recorded tax/cost reversal (treated as zero).

Limits: at most 3000 sales/payments and 2000 returns/repairs/expenses per report; a longer period gets `TOO_MANY_RECORDS`. Period max 366 days.

## Daily closing (changed)
Expected cash = opening + cash sales + cash collected on balances + cash taken at repair hand-over - cash refunds - cash expenses - cash supplier payments. Closings made before Phase 10 are unchanged.

## Reconciliation
You type the statement's net total for a method and period; the system compares it with its own net movement and stores the difference. No bank import.

## Export
CSV for expenses, collections and the report summary (finance:read). Cells beginning with `= + - @` get a leading apostrophe so spreadsheets do not run them as formulas.

## Access
Collect payments and create plans: `sales:create` (branch-scoped). Read plans/receipts: `sales:read`. Expenses, payables, reports, reconciliation, export: `finance:read` / `finance:write` (owner and accountant; check `docs/PERMISSIONS.md`). New collections (`installments`, `payments`, `supplierPayments`, `reconciliations`, `repairCosts`) are server-only (no client rule). `expenses` keeps its Phase 2 read rule.

## Indexes to deploy
`firebase deploy --only firestore:indexes` (payments, supplierPayments, expenses, reconciliations by branch + date; repairJobs by branch + deliveredAt/dueAmount; sales by branch + dueAmount).
