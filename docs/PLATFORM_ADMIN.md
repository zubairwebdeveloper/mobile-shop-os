# Platform admin (Phase 4)

Area: `/platform/*`. Only users with a `platformAdmins/{uid}` document (created by `scripts/bootstrap-admin.js`) can
open it; everyone else gets a 404. Every page and API route re-checks `requirePlatformAdmin()`.

| Page | What it does |
|---|---|
| Dashboard | Live counts (shops, active, suspended, pending applications, users, plans), shops at 80%+ of branch limit, recent audit entries |
| Applications | Phase 3 review queue |
| Shops | Searchable list; detail page with owner, usage, subscription form, suspend/reactivate, recent shop audit |
| Plans | Create/edit plans (limits, price, features, visibility, archive) |
| Audit log | Newest-first platform log with "Older entries" paging |

## Rules worth knowing
- **Suspension** sets `tenants/{id}.status = SUSPENDED`. `requireTenantAccess`, Firestore rules and Storage rules already
  require ACTIVE, so access stops immediately. The dashboard layout redirects members to `/suspended`. No data is deleted.
- **Plans are data.** Price is entered in whole PKR and stored in paisa; empty means "contact us". Seeded plans
  (`npm run seed:plans`, emulator only) are placeholders: hidden, no price, `isPlaceholder: true`. Real prices/limits are your decision.
- **Snapshot limits.** Assigning a plan copies its limits onto the shop. Editing a plan later does not change existing
  shops until their subscription is saved again. A downgrade is blocked while branch usage exceeds the new limit.
- **Manual billing only.** No payment gateway. Each subscription save adds `tenants/{id}/subscriptionHistory` (server-only).
- **No impersonation** by design: admins cannot act as a shop user.
- Audit: `platformAuditLogs` plus `tenants/{id}/auditLogs`; both are append-only from the app.
