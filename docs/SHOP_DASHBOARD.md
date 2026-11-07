# Shop dashboard (Phase 5)

| Page | Who | What |
|---|---|---|
| `/dashboard` | all members | Live branch and team counters, recent audit (owner). Business tiles show a dash until their module exists |
| `/dashboard/settings` | view: all, edit: OWNER | Shop name, phone, city, address, timezone |
| `/dashboard/team` | OWNER | Members (role, status, branch access), invitations |
| `/dashboard/audit-logs` | OWNER | Newest-first shop audit log with paging |
| `/invitations` | invited user | Accept pending invitations (also reached automatically when a user has no shop but has an invitation) |

## Rules
- **Branch selector** (header) is display-only Redux state. Members limited to specific branches only see those branches and have no "All branches" option; the server re-checks branch access on every query.
- **Roles:** OWNER can never be assigned or changed here (no ownership transfer yet). Nobody can edit their own row. Staff roles: Manager, Cashier, Technician, Accountant.
- **Team limit:** `limits.maxEmployees` is enforced when an invitation is accepted and when a disabled member is re-enabled (counts ACTIVE members).
- **Disabling** takes effect on the next request (membership is read from the database every time) and removes the shop from that user's switcher.
- **Invitations:** top-level `tenantInvitations` (server-only). The tenant comes from the invitation document, never from the request; an email mismatch looks like "not found". **No email is sent** (no mail provider chosen yet): tell the person to sign up or sign in with the invited address.
- Notifications stay a placeholder until Phase 7 (low stock). Not fabricated.
