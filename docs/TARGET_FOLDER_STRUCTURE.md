# Recommended Target Folder Structure (Phase 0)

Based on the master prompt tree. **Folders are created only when their phase begins; no empty placeholder files.**
JavaScript/JSX only (`jsconfig.json`, `.js`/`.jsx`).

```
mobile-shop-os/
├── public/                 images/ models/ icons/ fonts/ manifest.json   (models/ only in Phase 18)
├── src/
│   ├── app/
│   │   ├── (marketing)/    home, features, solutions, pricing, about, contact, blog, demo, docs, legal
│   │   ├── (auth)/         login, register, forgot/reset-password, verify-email, invitation
│   │   ├── onboarding/     application, pending
│   │   ├── (platform)/platform/   dashboard, tenants, applications, users, subscriptions, plans, usage, support, audit-logs, settings
│   │   ├── (dashboard)/dashboard/ pos, products, categories, inventory, imei, stock-movements, purchases, suppliers,
│   │   │                          sales, returns, exchanges, customers, warranties, repairs, installments, trade-in,
│   │   │                          employees, attendance, commissions, branches, finance, expenses, analytics,
│   │   │                          ai-assistant, ai-insights, whatsapp, online-store, notifications, audit-logs, settings
│   │   ├── (customer)/customer/   dashboard, invoices, warranties, repairs, installments, support
│   │   ├── (store)/s/[shopSlug]/  public storefront (added: needs a distinct public route group)
│   │   ├── api/            auth, tenants, onboarding, products, inventory, sales, purchases, customers, repairs,
│   │   │                   installments, ai, whatsapp, webhooks, cron
│   │   └── layout.jsx, globals.css, loading.jsx, error.jsx, not-found.jsx, robots.js, sitemap.js
│   ├── components/         ui/ shared/ marketing/ navigation/ dashboard/ forms/ tables/ charts/ dialogs/
│   │                       notifications/ scanner/ ai/ three/{scenes,models,camera,effects,fallbacks}/ animations/
│   ├── features/           one folder per module: components/, services/ (client calls), schemas/ (zod),
│   │                       server/ (server-only logic), constants.js
│   ├── lib/
│   │   ├── firebase/       client.js · admin.js (server-only) · auth.js · firestore.js · storage.js
│   │   ├── auth/ tenant/ permissions/ security/ ai/ whatsapp/ offline/ validations/ calculations/
│   │   │ formatters/ constants/ utils/
│   ├── store/              index.js · ReduxProvider.jsx · slices/*.js
│   ├── hooks/ contexts/ config/ styles/
│   └── data-shapes/        (rename of `types-of-data/`; JSDoc typedefs only, since no TypeScript)
├── functions/              only if a Firebase Functions backend is approved (see decision below)
├── scripts/                seed-demo-data.js · bootstrap-admin.js · maintenance/
├── tests/                  unit/ integration/ e2e/ security/ firestore-rules/ storage-rules/
├── docs/                   ARCHITECTURE · FIRESTORE_SCHEMA · FIRESTORE_INDEXES · SECURITY · TENANT_ISOLATION ·
│                           PERMISSIONS · API_DOCUMENTATION · AI_ARCHITECTURE · OFFLINE_SYNC · TESTING · DEPLOYMENT
├── firestore.rules · firestore.indexes.json · storage.rules · firebase.json
├── .env.example · .gitignore · components.json · eslint.config.mjs · jsconfig.json
├── next.config.mjs · postcss.config.mjs · package.json · README.md · SECURITY.md
```

## Adjustments from the master prompt
1. **`(store)/s/[shopSlug]`** added for the public storefront; keeps it separate from the authenticated dashboard.
2. **`types-of-data/` -> `data-shapes/`** with JSDoc typedefs (clearer name, JS-only project).
3. **`functions/`** is optional: scheduled jobs/Firestore triggers via Cloud Functions may need a paid Firebase
   plan **[VERIFY]**. Default plan: Next.js route handlers + Admin SDK; cron via the hosting platform's
   scheduler. Decision needed.
4. **Feature module layout**: each `features/<name>/` keeps UI, services, zod schemas and `server/` logic
   together; `server/` files import `server-only`.
5. **Tenant routing**: dashboard URL does not carry an authoritative tenantId; active tenant resolved
   server-side from session + membership (optionally a `?tenant=` hint that is always re-verified).
6. **Marketing/3D code** isolated under `components/marketing` and `components/three`, dynamically imported,
   never referenced from dashboard layouts.
7. **Shadcn conventions** (your preferences): Field components with React Hook Form, Card for form
   containers, never `asChild`.
