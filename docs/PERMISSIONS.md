# PERMISSIONS.md

Source of truth in code: `src/lib/permissions/matrix.js`. Firestore and Storage rules repeat the role
lists by hand (rules cannot import JS), so **any change must be made in all three places** and the
rules tests re-run.

| Permission area | OWNER | MANAGER | CASHIER | TECHNICIAN | ACCOUNTANT |
|---|---|---|---|---|---|
| Catalogue read | yes | yes | yes | yes | yes |
| Catalogue write | yes | yes | no | no | no |
| Inventory read / adjust | yes / yes | yes / yes | read | read | read |
| Sales read / create | yes / yes | yes / yes | yes / yes | no | read |
| Refund approval | yes | yes | no | no | no |
| Purchases read / write | yes / yes | yes / yes | no | no | read |
| Customers read / write | yes | yes | yes | read | no |
| Customers private data | yes | yes | no | no | no |
| Repairs read / write | yes | yes | read | yes | no |
| Finance read / write | yes | yes | no | no | yes |
| Employees | yes | yes | no | no | no |
| Members, settings, audit log | OWNER only | no | no | no | no |

Branch scope: a member has `allBranches: true` or an explicit `branchIds` list. Branch-owned
documents (sales, inventory, IMEI, repairs, finance...) carry `branchId`; rules and server checks enforce it.

Platform admin (`platformAdmins/{uid}`) is separate from tenant roles and grants **no** access to tenant
business data in the rules. Platform-level tenant management is done through server routes (Phase 4).
