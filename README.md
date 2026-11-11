# ZUBAIR MOBILE

### Buy Smarter. Sell Faster. Manage Everything.

**ZUBAIR MOBILE** is a modern, AI-powered mobile commerce and mobile
shop management platform. It combines a premium smartphone shopping
experience with powerful tools for managing products, inventory, orders,
suppliers, repairs, and business performance.

Built with Next.js, JavaScript, Firebase, Tailwind CSS, shadcn/ui, Redux
Toolkit, and Google Gemini AI.

------------------------------------------------------------------------

## Project Overview

ZUBAIR MOBILE is designed as a complete mobile commerce ecosystem:

-   A premium online smartphone store.
-   AI-powered product discovery and recommendations.
-   Shopping cart, wishlist, checkout, and order tracking.
-   Mobile shop inventory and IMEI management.
-   Supplier, purchase, warranty, and repair management.
-   Sales, profit, and business analytics.
-   A scalable foundation for future multi-tenant SaaS expansion.

**Initial architecture:** Single-shop platform with SaaS-ready
foundations.\
**Target market:** Pakistan and international customers.\
**Primary currency:** PKR, with future multi-currency support.

------------------------------------------------------------------------

## Core Features

### 1. Public Storefront

-   Premium, responsive homepage.
-   Product catalog, categories, and brand collections.
-   Featured products, latest phones, and special deals.
-   Search, sorting, and advanced filters.
-   Product detail pages and image galleries.
-   Image zoom and product variants.
-   Detailed smartphone specifications.
-   Customer reviews and ratings.
-   Related product recommendations.
-   Product comparison for up to four devices.
-   Blog, buying guides, FAQ, and contact pages.

**Important:** Public storefront pages must remain accessible without
customer or administrator authentication.

### 2. Shopping System

-   Shopping cart and wishlist.
-   Secure checkout.
-   Customer and shipping information.
-   Coupon and discount management.
-   Cash on Delivery (COD).
-   Manual bank transfer.
-   Order confirmation and tracking.
-   Customer order history.
-   Invoice generation.

Online payment gateways can be integrated later according to provider
availability and business eligibility in the relevant country.

### 3. AI Shopping Assistant

Powered by Google's Gemini API:

-   AI shopping assistant.
-   Natural-language product search.
-   Budget-based smartphone finder.
-   Smartphone recommendations.
-   AI-powered phone comparisons.
-   Product specification explanations.
-   Review summarization.
-   Customer support assistance.

AI must use verified backend product and inventory data. It must never
invent prices, stock levels, or order statuses.

### 4. Admin Dashboard

-   Business overview and analytics.
-   Product, category, and brand management.
-   Inventory and stock management.
-   Order and customer management.
-   Coupon and review management.
-   Blog and content management.
-   Store settings and notifications.
-   Sales and profit reports.

### 5. Advanced Mobile Shop Management

-   IMEI and serial number tracking.
-   New, used, and refurbished device records.
-   Individual device inventory.
-   Stock adjustments and low-stock alerts.
-   Supplier management.
-   Purchase management.
-   Warranty management.
-   Mobile repair management.
-   Sales and profit tracking.
-   Cash reconciliation.
-   POS-ready architecture.
-   Barcode and QR-ready architecture.

### 6. AI Admin Assistant

-   Business performance summaries.
-   Sales and inventory insights.
-   Low-stock recommendations.
-   Product description generation.
-   Authorized business-data questions.
-   Customer support assistance.

Administrative AI features must only access data permitted for the
authenticated administrator.

------------------------------------------------------------------------

## Technology Stack

  Technology                     Purpose
  ------------------------------ ---------------------------
  Next.js App Router             Full-stack application
  JavaScript / JSX               Application development
  React                          User interface
  Tailwind CSS                   Styling
  shadcn/ui                      UI components
  Radix UI                       Accessible primitives
  Lucide React                   Icons
  Framer Motion                  Animations
  Three.js / React Three Fiber   Optional 3D experiences
  Firebase Authentication        User authentication
  Cloud Firestore                Database
  Firebase Storage               Media storage
  Firebase Admin SDK             Trusted server operations
  Redux Toolkit                  Shared client-side state
  React Hook Form                Form management
  Zod                            Validation
  Google Gemini API              AI functionality
  Recharts                       Analytics and charts
  Vitest                         Unit testing
  Playwright                     End-to-end testing
  Vercel                         Deployment

**Development rule:** Use JavaScript and JSX only. Do not introduce
TypeScript or `.ts` / `.tsx` files.

------------------------------------------------------------------------

## Design System

The visual identity should feel premium, modern, minimal, and
trustworthy.

### Brand Colors

  Color           Hex         Usage
  --------------- ----------- ---------------------
  Midnight        `#101827`   Dark theme
  Cloud           `#F4F6FA`   Light backgrounds
  Electric Blue   `#2563EB`   Primary actions
  Mint            `#16A085`   Positive indicators
  White           `#FFFFFF`   Surfaces
  Slate           `#64748B`   Secondary text
  Border          `#E2E8F0`   Borders

### Typography

-   **Manrope:** Headings.
-   **Inter:** General interface text.
-   **Space Grotesk:** Selected promotional headings.

### UI Principles

-   Premium dark, light, and system themes.
-   Clean layouts and consistent spacing.
-   Responsive, mobile-first components.
-   Accessible contrast and keyboard navigation.
-   Subtle hover interactions and smooth animations.
-   Reduced-motion support.
-   Lazy-loaded 3D experiences.
-   Optimized images and fast loading.

------------------------------------------------------------------------

## Development Roadmap

Development must follow a controlled, phase-by-phase workflow.

  Phase   Description
  ------- ------------------------------------------------------
  01      Project foundation and design system
  02      Complete public storefront
  03      Cart, wishlist, checkout, and shopping
  04      Firebase backend and customer authentication
  05      Temporary development admin and dashboard
  06      Advanced mobile shop management
  07      Gemini AI integration
  08      Customer experience and advanced features
  09      Permanent SUPER_ADMIN, RBAC, and production security
  10      Testing, optimization, and deployment
  11      Future multi-tenant SaaS expansion

### Critical Development Rules

1.  **Build the public website first.** Complete the public storefront
    before introducing admin authentication or dashboard restrictions.
2.  **Do not implement permanent SUPER_ADMIN early.** Permanent
    SUPER_ADMIN, staff roles, complex permissions, and production RBAC
    belong in Phase 09.
3.  **Introduce temporary admin later.** After Firebase backend setup,
    add a development-only temporary admin account so the developer can
    access both the public storefront and admin dashboard.
4.  **Protect temporary access.** Verify identity server-side, use
    environment variables, require development-mode checks, and reject
    temporary admin access in production.
5.  **Build one phase at a time.** Finish, test, and report the current
    phase, then stop and wait for explicit approval.
6.  **Never gate public browsing behind admin login.**

### Temporary Development Admin

Example environment configuration:

``` env
TEMP_ADMIN_ENABLED=false
TEMP_ADMIN_EMAIL=
TEMP_ADMIN_PASSWORD=
```

Rules:

-   Never hardcode credentials.
-   Never expose credentials in frontend code.
-   Verify the Firebase identity server-side.
-   Require the development environment.
-   Reject temporary admin access in production.
-   Do not use temporary configuration as permanent authorization.

------------------------------------------------------------------------

## Suggested Project Structure

``` text
src/
├── app/
│   ├── (store)/
│   │   ├── page.jsx
│   │   ├── products/
│   │   ├── categories/
│   │   ├── brands/
│   │   ├── deals/
│   │   ├── compare/
│   │   ├── blog/
│   │   └── contact/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── account/
│   ├── admin/
│   └── api/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── navigation/
│   ├── product/
│   ├── cart/
│   ├── checkout/
│   ├── animations/
│   ├── three/
│   ├── ai/
│   └── shared/
├── features/
│   ├── auth/
│   ├── products/
│   ├── cart/
│   ├── wishlist/
│   ├── orders/
│   ├── inventory/
│   ├── comparison/
│   └── ai-shopping/
├── store/
│   ├── index.js
│   └── slices/
├── lib/
│   ├── firebase/
│   ├── ai/
│   ├── validations/
│   ├── permissions/
│   ├── constants/
│   └── utils/
├── hooks/
├── providers/
├── services/
└── config/

tests/
├── unit/
├── integration/
└── e2e/

public/
├── images/
├── icons/
└── animations/

firebase/
├── firestore.rules
├── firestore.indexes.json
└── storage.rules/

.env.example
.gitignore
README.md
```

This is the target architecture. Create folders and files progressively
as they are needed; do not generate unnecessary empty files during the
foundation phase.

------------------------------------------------------------------------

## Firebase Database Architecture

Suggested Firestore collections:

``` text
tenants/
users/
adminUsers/
products/
categories/
brands/
inventory/
orders/
carts/
wishlists/
reviews/
coupons/
suppliers/
purchases/
warranties/
repairs/
notifications/
conversations/
supportTickets/
storeSettings/
auditLogs/
subscriptions/
```

### Database Principles

-   Keep product catalog data separate from physical inventory records.
-   Use unique IMEI or serial records where applicable.
-   Use trusted server timestamps.
-   Validate business-critical data on the server.
-   Use transaction-safe stock updates.
-   Prevent overselling.
-   Include tenant identifiers on business-owned records for future SaaS
    expansion.
-   Avoid duplicating Firestore data unnecessarily in Redux.

------------------------------------------------------------------------

## Security Architecture

### Public Storefront

-   Public product, category, and brand browsing.
-   Public product search.
-   No forced login for visitors.

### Customer Authentication

-   Firebase Authentication.
-   Email verification and password reset.
-   Secure account management.
-   Server-side token verification for protected operations.

### Final Production Security

-   Permanent SUPER_ADMIN.
-   Role-based access control.
-   Permission-based authorization.
-   Firestore and Storage security rules.
-   Firebase App Check.
-   Server-side authorization.
-   API rate limiting.
-   Input validation.
-   Audit logs.
-   Secure payment webhook verification.
-   Idempotent payment and order processing.
-   Environment-based secrets.

------------------------------------------------------------------------

## Environment Variables

Create `.env.example` with placeholders for required configuration.

``` env
# Application
NEXT_PUBLIC_APP_URL=

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Gemini AI
GEMINI_API_KEY=

# Temporary Development Admin
TEMP_ADMIN_ENABLED=false
TEMP_ADMIN_EMAIL=
TEMP_ADMIN_PASSWORD=
```

Add payment, email, shipping, and integration variables when those
features are implemented. Never commit real API keys, passwords, private
keys, or service-account credentials.

------------------------------------------------------------------------

## Development Standards

1.  Inspect the existing project before making changes.
2.  Preserve working functionality.
3.  Use reusable components and consistent naming.
4.  Prefer Server Components by default.
5.  Use Client Components only when interactivity requires them.
6.  Use shadcn/ui for consistent interface components.
7.  Use React Hook Form and Zod for forms and validation.
8.  Use Redux Toolkit for shared client-side state only.
9.  Keep secrets and API keys server-side.
10. Validate critical operations on the backend.
11. Maintain responsive and accessible layouts.
12. Optimize images, loading, and rendering performance.
13. Run linting and relevant tests.
14. Run production builds where appropriate.
15. Fix errors before declaring a phase complete.
16. Report actual files changed, dependencies added, and test results.
17. Stop after each phase and wait for explicit approval.

------------------------------------------------------------------------

## Getting Started

### Requirements

-   Node.js 20 or a compatible supported version.
-   npm.
-   Git.
-   A Firebase project.
-   Gemini API key for AI features.

### Installation

``` bash
git clone YOUR_REPOSITORY_URL
cd zubair-mobile
npm install
```

### Configure Environment

Create `.env.local` in the project root and add the required Firebase
configuration.

PowerShell:

``` powershell
Copy-Item .env.example .env.local
```

### Start Development Server

``` bash
npm run dev
```

Open `http://localhost:3000` in your browser.

------------------------------------------------------------------------

## Quality Assurance

Before marking a phase complete, verify its relevant functionality.

``` bash
npm run lint
npm run build
```

Run tests when configured:

``` bash
npm run test
npm run test:e2e
```

Never report successful builds or tests unless they have actually
completed successfully.

------------------------------------------------------------------------

## Deployment

Recommended hosting platform: **Vercel**.

Recommended infrastructure:

-   Vercel for Next.js hosting.
-   Firebase Authentication for identity.
-   Cloud Firestore for application data.
-   Firebase Storage for media.
-   Gemini API for AI capabilities.

Production deployment must use production environment variables,
verified authorization, secure Firebase rules, and disabled temporary
admin access.

------------------------------------------------------------------------

## Future SaaS Expansion

The initial release targets a single mobile shop, with foundations for
future multi-tenant SaaS capabilities:

-   Multiple independent mobile shops.
-   Separate shop dashboards.
-   Tenant-specific product catalogs.
-   Subscription plans and billing.
-   Staff accounts and permissions.
-   Multi-branch inventory.
-   Centralized SaaS administration.
-   Advanced analytics and AI business intelligence.

Every tenant must have properly isolated data and permissions before
multi-tenant functionality is released.

------------------------------------------------------------------------

## Project Status

-   [ ] Phase 01 --- Project Foundation
-   [ ] Phase 02 --- Public Storefront
-   [ ] Phase 03 --- Shopping System
-   [ ] Phase 04 --- Firebase Backend
-   [ ] Phase 05 --- Temporary Development Admin
-   [ ] Phase 06 --- Advanced Shop Management
-   [ ] Phase 07 --- AI Integration
-   [ ] Phase 08 --- Customer Experience
-   [ ] Phase 09 --- Permanent SUPER_ADMIN and Production Security
-   [ ] Phase 10 --- Testing and Deployment
-   [ ] Phase 11 --- SaaS Expansion

------------------------------------------------------------------------

## Brand Identity

**ZUBAIR MOBILE**\
*Buy Smarter. Sell Faster. Manage Everything.*

A modern mobile commerce and business management ecosystem built to make
buying smartphones easier and running a mobile shop smarter.

------------------------------------------------------------------------

## License

All rights reserved unless a separate open-source license is added to
this repository.
