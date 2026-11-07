# TENANT_ISOLATION.md

## Layers (all must agree; any one alone is not enough)
1. **Path-based ownership.** All tenant data lives under `tenants/{tenantId}/...`. The tenant is the path,
   not a field the client can set.
2. **Server gate: `requireTenantAccess(tenantId, { permission, branchId })`** (`src/lib/tenant/context.js`).
   Verifies from the database: valid non-revoked session, tenant ACTIVE, membership ACTIVE, role grants the
   permission, branch allowed. Returns the verified context; routes must use that, never body/query values.
   Missing tenant, non-member, suspended tenant, wrong role and wrong branch all return the same 403, so tenant
   IDs cannot be enumerated. IDs are validated against `^[A-Za-z0-9_-]{1,128}$` (no path injection).
3. **Firestore rules.** Default deny; every client write denied; reads only for ACTIVE members of ACTIVE tenants
   by role and branch.
4. **Storage rules.** Paths `tenants/{tenantId}/...`, membership-checked, file type and size limited.
5. **Client state.** `branchSlice` resets on `switchTenant` / `setTenantContext` / `clearTenantContext`.
   Redux is display-only and never a security boundary. The `msos_tenant` cookie is only a *hint*:
   `resolveActiveTenant` accepts it only if the user really has that membership.

## Rule for every future route / Server Action
```js
const ctx = await requireTenantAccess(tenantId, { permission: PERMISSIONS.SALES_CREATE, branchId });
// use ctx.tenantId, ctx.user.uid, ctx.role from here on
```
Layout redirects are NOT authorization (layouts do not re-run on client navigation).

## Tests
`tests/firestore-rules/tenant-isolation.test.js` covers: unauthenticated access, cross-tenant reads (both
directions), removed member, suspended tenant, role restrictions, branch isolation (incl. list queries),
client writes denied (incl. role self-escalation and self-made platform admin), platform data, default deny.
`tests/storage-rules/storage-access.test.js` covers tenant-scoped file access.
Still to add (needs real data routes): server-route tests for `requireTenantAccess` with the Admin SDK emulator.
