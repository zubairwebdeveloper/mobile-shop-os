# Staff and branch operations (Phase 11)

## Staff records
`employees/{id}`: name, phone, designation, branch, join date, commission rate, monthly target, status, optional link to ONE team member account. A record is **not a login**: sign-in, role and branch access stay in Team (Phase 5). The link is claimed in `employeeLinks/{uid}` inside the same transaction, so two employees can never share an account. **No salary or pay is stored.** At most 300 records per shop. Roles and branch permissions already exist from Phases 2 and 5.

## Attendance
Marked by a manager or owner (`employees:write`) per branch and day. One record per employee per day (id `employeeId_date`), so re-saving corrects instead of duplicating. Future days and days before the join date are refused. Rows left "Not marked" are not saved: the system never assumes present or absent.
Monthly summary: an explicit mark wins; otherwise a day inside APPROVED leave counts as leave; otherwise a past day is "not marked". Attendance % = (present + late + half-day x 0.5) / (present + late + half-day + absent). Weekly offs and holidays are not modelled.

## Leave
Entered by a manager or owner on the employee's behalf (no staff self-service screen yet). PENDING -> APPROVED / REJECTED / CANCELLED; APPROVED -> CANCELLED. Two live requests of one person may not overlap; max 90 days per request. Leave balances and paid/unpaid accounting are not built.

## Sales credit, targets, performance
A sale is credited to the team account that rang it up (`sale.createdBy`) through the linked employee. Value = net sales: line total minus tax, minus refunds (also without their tax). Returns are charged back to the **original** sale even when processed later. Sales by accounts not linked to an employee are shown on their own line, never silently dropped.
Target progress is shown only when the period is exactly one calendar month. Branch table: sales count, net sales, average sale, returns, repairs handed over, attendance %. **Profit is not shown here**: purchase cost is private and lives on the Finance page.

## Commission
Percentage (0 to 20, two decimals) of the person's **net sales**, rounded down to whole rupees. It is not based on profit. A live preview shows for any month. **Finalise** (`employees:write`) works only for a month that has ended, recomputes the sales on the server, and stores a snapshot (`commissions/{employeeId_YYYY-MM}`, created once). Later returns do not change a finalised month (adjust it manually next month). **Mark paid** changes the status only; record the money you hand over as an expense (Salary) under Expenses.

## Activity history
On an employee's page, owners (`audit:read`) see the recent actions of the linked account (action names and times; no amounts).

## Access
Everything here needs `employees:read` / `employees:write` (owner and manager) and access to the employee's branch. Cashier, technician and accountant have no access. `employees` is readable by the client only for owner/manager in the same branch (Phase 11 narrowed this from "all branches"); `attendance`, `leaveRequests`, `commissions`, `employeeLinks` are server-only.

## Indexes to deploy
`firebase deploy --only firestore:indexes` and `--only firestore:rules` (employees rule changed): attendance (branch + date), auditLogs (actorUid + createdAt).
