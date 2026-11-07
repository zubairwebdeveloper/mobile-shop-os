# Mobile Shop OS

A modern, multi-tenant Mobile Retail Management SaaS built to help
mobile phone shops manage sales, inventory, purchasing, repairs,
customers, suppliers, staff, payments, and business performance from one
connected platform.

> **Project status:** Active development / evolving product
> specification. This README defines the intended product experience,
> design system, architecture, modules, and roadmap. Features listed as
> planned must not be presented as production-ready until they are
> implemented, tested, and enabled.

------------------------------------------------------------------------

## Table of Contents

1.  [Product Overview](#product-overview)
2.  [Vision and Goals](#vision-and-goals)
3.  [Design Direction and Visual
    System](#design-direction-and-visual-system)
4.  [Technology Stack](#technology-stack)
5.  [Application Architecture](#application-architecture)
6.  [Main Applications and Modules](#main-applications-and-modules)
7.  [Roles and Permissions](#roles-and-permissions)
8.  [Core Business Workflows](#core-business-workflows)
9.  [Data Model and Firestore
    Structure](#data-model-and-firestore-structure)
10. [UI/UX Standards](#uiux-standards)
11. [Security and Data Protection](#security-and-data-protection)
12. [Offline and Sync Strategy](#offline-and-sync-strategy)
13. [Project Structure](#project-structure)
14. [Getting Started](#getting-started)
15. [Environment Variables](#environment-variables)
16. [Development Commands](#development-commands)
17. [Testing and Quality](#testing-and-quality)
18. [Deployment](#deployment)
19. [Development Roadmap](#development-roadmap)
20. [Product and Engineering
    Principles](#product-and-engineering-principles)

------------------------------------------------------------------------

## Product Overview

Mobile Shop OS is designed for mobile phone retailers, accessories
stores, repair shops, and multi-branch mobile businesses.

It brings the daily work of a mobile shop into one system:

-   Sell phones, tablets, accessories, and other configured products.
-   Track stock by product, variant, serial number, IMEI, and branch.
-   Record purchases, supplier invoices, and stock transfers.
-   Manage customers, warranties, returns, exchanges, and repair jobs.
-   Handle cash, card, bank transfer, and configured payment methods.
-   Track expenses, cash drawers, staff shifts, and profit-related
    reports.
-   Operate multiple branches under one business account.
-   Give owners a clear view of sales, stock, cash flow, and
    performance.

The product has three primary experiences:

1.  **Retail workspace:** POS, product lookup, checkout, returns, and
    repair counter.
2.  **Management workspace:** inventory, purchasing, customers,
    suppliers, staff, expenses, and reports.
3.  **Platform workspace:** SaaS tenant onboarding, subscriptions,
    feature access, and platform operations.

## Vision and Goals

### Vision

Build a dependable retail operating system that helps a small mobile
shop run professionally today and gives a growing retailer the structure
to manage multiple branches tomorrow.

### Goals

-   Make checkout fast and simple, even during busy hours.
-   Reduce stock errors through serial/IMEI-aware inventory.
-   Keep a traceable history of every sale, purchase, return, and stock
    adjustment.
-   Make warranties and repair jobs easy to find and manage.
-   Give owners useful business reports without requiring spreadsheets.
-   Support multiple branches with strict tenant and branch data
    isolation.
-   Work reliably on desktop POS terminals, tablets, and mobile devices.
-   Design for unstable internet connections with safe offline
    capabilities where supported.
-   Keep the codebase modular so new retail features can be added
    without destabilizing existing workflows.

------------------------------------------------------------------------

## Design Direction and Visual System

### Overall look and feel

The interface should look like a premium, modern retail SaaS product:
clean, confident, data-focused, and quick to operate. Avoid cluttered
legacy POS styling, excessive gradients, and decorative elements that
compete with important sales information.

**Design principles**

-   Clear hierarchy with strong page titles, concise descriptions, and
    obvious primary actions.
-   Neutral backgrounds and surfaces with a restrained brand accent.
-   Consistent cards, tables, forms, dialogs, badges, and navigation.
-   Dense information presented with good spacing and readable
    typography.
-   Clear visual separation between financial values, stock states, and
    operational alerts.
-   Subtle animation for transitions and feedback; never slow down
    checkout.
-   Responsive layouts for desktop, tablet, and mobile.
-   Accessible contrast, keyboard focus, and touch-friendly controls.
-   Use color to communicate status, not as decoration.

### Suggested color tokens

Use centralized CSS variables so branding can be changed without editing
individual components.

  Token                Suggested value   Usage
  -------------------- ----------------- ------------------------------------
  Primary              `#2563EB`         Main actions and active navigation
  Primary foreground   `#FFFFFF`         Text on primary buttons
  App background       `#F8FAFC`         Main light workspace
  Surface              `#FFFFFF`         Cards, panels, dialogs
  Main text            `#0F172A`         Headings and body text
  Muted text           `#64748B`         Helper text and secondary labels
  Border               `#E2E8F0`         Dividers, outlines, inputs
  Success              `#16A34A`         Paid, completed, in-stock
  Warning              `#D97706`         Low stock, pending, attention
  Destructive          `#DC2626`         Failed, cancelled, critical
  Info                 `#0891B2`         Informational states
  Accent               `#7C3AED`         Optional highlights and analytics

These are suggested starting values, not hardcoded requirements. Dark
mode should have its own carefully tuned tokens.

### Typography

-   Use a clean UI font such as **DM Sans** or **Inter**.
-   Use consistent heading and body scales.
-   Use tabular numerals for prices, quantities, margins, and report
    values.
-   Keep product names and IMEI/serial values easy to scan.
-   Use monospace styling selectively for IMEI, SKU, invoice, and
    transaction references.

### Main layout patterns

**Management dashboard** - Collapsible left sidebar. - Top header with
branch selector, global search, notifications, and account menu. -
Breadcrumbs and page actions. - Summary cards followed by charts and
recent activity. - Responsive content grid.

**POS workspace** - Full-height sales screen. - Product search and
category/filter area. - Product grid or compact result list. -
Persistent cart and payment summary. - Fast product scanning and
IMEI/serial selection. - Large, clear checkout controls.

**Inventory workspace** - Searchable data table with filters. - Stock
status and branch visibility. - Product detail drawer or page. - Variant
and serial/IMEI views. - Purchase and stock movement history.

**Repair counter** - Repair intake form. - Device/customer details. -
Diagnosis and issue description. - Job status board. - Technician
assignment and estimated completion. - Collection and payment status.

### Motion and feedback

-   Use Framer Motion for restrained page transitions, drawers, and
    micro-interactions.
-   Use skeleton loaders for data-heavy screens.
-   Use clear toast feedback after successful actions.
-   Confirm destructive actions and financially sensitive operations.
-   Respect `prefers-reduced-motion`.
-   Avoid animated backgrounds or heavy visual effects in POS and
    inventory screens.

------------------------------------------------------------------------

## Technology Stack

The project is designed around a JavaScript-first Next.js architecture.

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Framework               Next.js App Router      Routing, layouts,
                                                  server rendering, route
                                                  handlers

  Language                JavaScript / JSX        Application code; no
                                                  TypeScript requirement

  UI                      React                   Component-based
                                                  interface

  Styling                 Tailwind CSS            Responsive styling and
                                                  design tokens

  Components              shadcn/ui + Radix UI    Accessible reusable
                                                  primitives

  Icons                   Lucide React            Consistent interface
                                                  icons

  Motion                  Framer Motion           Subtle interactions and
                                                  transitions

  Forms                   React Hook Form + Zod   Form state and
                                                  validation

  Tables                  TanStack Table /        Inventory and
                          Virtual                 transaction tables

  Charts                  Recharts                Sales and business
                                                  analytics

  Client state            Zustand                 POS cart and local UI
                                                  state

  Authentication          Firebase Authentication User identity and
                                                  sessions

  Database                Cloud Firestore         Products, sales,
                                                  purchases, and
                                                  operations

  Storage                 Firebase Storage        Product images and
                                                  documents

  Trusted server          Firebase Admin SDK      Privileged server-side
  operations                                      access

  Offline storage         IndexedDB + Dexie       Local cache and queued
                                                  operations

  Unit tests              Vitest                  Business logic and
                                                  component tests

  E2E tests               Playwright              End-to-end retail
                                                  workflows

  Monitoring              Sentry (planned)        Production error
                                                  monitoring

  Hosting                 Vercel                  Next.js application
                                                  deployment
  -----------------------------------------------------------------------

Keep Firebase Admin SDK code server-only. Never expose service account
credentials or private API keys to browser code.

------------------------------------------------------------------------

## Application Architecture

Organize the application into feature modules and clear layers.

1.  **Presentation layer:** dashboard, POS, inventory, repair desk,
    purchasing, and reports.
2.  **Feature layer:** products, variants, IMEI/serial tracking, sales,
    returns, purchases, warranties, repairs, and customers.
3.  **Application/service layer:** validation, permissions, pricing,
    stock movements, and transaction orchestration.
4.  **Data access layer:** Firestore repositories and Storage services.
5.  **Infrastructure layer:** Firebase Authentication, Firestore Rules,
    App Check, Admin SDK, monitoring, and deployment.

### Multi-tenant architecture

A tenant represents one mobile retail business. A tenant can have one or
more branches.

``` text
Platform
└── Tenant (Mobile Retail Business)
    ├── Branch A
    │   ├── Staff and shifts
    │   ├── Products and stock
    │   ├── IMEI / serial records
    │   ├── Sales and returns
    │   ├── Purchases
    │   └── Repair jobs
    └── Branch B
        ├── Staff and shifts
        ├── Products and stock
        ├── Sales and returns
        ├── Purchases
        └── Repair jobs
```

Every tenant-owned record must be scoped to a tenant. Branch-specific
records must also include a branch identifier. Every protected operation
must validate tenant membership, branch access, and permission on the
server or through secure Firestore Rules.

### Architectural rules

-   UI components must not contain scattered business-critical Firestore
    logic.
-   Use feature services/repositories for data access.
-   Validate all untrusted input.
-   Recalculate prices and totals in trusted code; do not trust
    browser-submitted totals.
-   Use transactions or atomic operations for stock and financial
    mutations.
-   Make retryable operations idempotent.
-   Keep audit history for sensitive operations.

------------------------------------------------------------------------

## Main Applications and Modules

## 1. Dashboard and Business Overview

A live summary of business activity.

**Dashboard metrics**

-   Today's gross sales and net sales.
-   Number of sales and average sale value.
-   Cash, card, bank, and other payment totals.
-   Estimated gross profit where cost data is available.
-   Total products and stock value.
-   Low-stock and out-of-stock products.
-   Recent purchases and supplier balances.
-   Pending repair jobs.
-   Returns and warranty claims.
-   Branch performance comparison.
-   Recent activity and important alerts.

**Dashboard interactions**

-   Date range filters.
-   Branch selector.
-   Clickable metrics that open the related filtered list.
-   Exportable reports where implemented.
-   Role-aware widgets so staff see only relevant information.

## 2. Point of Sale (POS)

The POS is the most important daily workflow. It should be fast,
predictable, and easy to use with a mouse, keyboard, touch screen, or
barcode scanner.

**Core features**

-   Search by product name, SKU, barcode, model, or IMEI.
-   Scan product barcodes where supported.
-   Browse categories and brands.
-   Select storage, color, RAM, or other variants.
-   Select the exact IMEI/serial number for tracked devices.
-   Add accessories and configured add-ons.
-   Change quantity where the product's tracking rules allow it.
-   Apply authorized discounts.
-   Add customer details or select an existing customer.
-   Choose payment method and record split payments if supported.
-   Calculate subtotal, discount, tax, and total.
-   Generate receipt/invoice.
-   Hold and resume a cart.
-   Process authorized returns and exchanges.
-   View recent sales and transaction details.

**POS requirements**

-   Keep cart and total visible.
-   Avoid duplicate checkout submissions.
-   Prevent selling unavailable or already-sold IMEI-tracked stock.
-   Revalidate stock and pricing before finalizing a sale.
-   Require permission for discounts, voids, and refunds.
-   Provide clear success/failure feedback.
-   Support keyboard shortcuts only when they are discoverable and do
    not conflict with browser behavior.

## 3. Product and Catalog Management

Manage all products sold by the business.

**Product fields**

-   Product name and slug.
-   Brand and model.
-   Category and subcategory.
-   Product type: phone, tablet, accessory, wearable, component, or
    custom.
-   Description and product images.
-   SKU and barcode.
-   Cost price and selling price.
-   Tax category where applicable.
-   Warranty duration and warranty terms.
-   Tracking mode: quantity-only, serial, or IMEI.
-   Active/inactive status.
-   Branch availability.

**Variants**

-   Color.
-   RAM.
-   Storage capacity.
-   Network or model variant.
-   Other configurable attributes.

Each sellable variant should have a stable identifier and its own
stock/pricing rules when necessary.

## 4. IMEI and Serial Number Tracking

IMEI-aware stock control is a key differentiator for mobile retailers.

**Core features**

-   Register IMEI1 and IMEI2 where applicable.
-   Store serial number for devices that use serial tracking.
-   Associate each identifier with a product variant and branch.
-   Record purchase source and purchase invoice.
-   Track status such as `IN_STOCK`, `RESERVED`, `SOLD`, `RETURNED`,
    `REPAIR`, or `TRANSFERRED`.
-   Search by full IMEI or serial number.
-   Prevent duplicate identifiers within the appropriate business scope.
-   Link sold device identifiers to the sale, customer, and warranty
    record.
-   Maintain a traceable movement history.

**Important validation**

-   Normalize identifiers before comparison.
-   Do not assume every product has an IMEI.
-   Do not allow an identifier already sold or assigned to another
    active stock unit to be sold again.
-   Restrict access to customer/device identifiers according to role.
-   Do not claim device authenticity, blacklist status, or carrier
    status unless a trusted external verification integration is
    implemented.

## 5. Inventory and Stock Management

**Core features**

-   Stock overview by branch.
-   Quantity on hand, reserved, available, and damaged.
-   Low-stock thresholds.
-   Stock adjustments with reason.
-   Stock transfers between branches.
-   Product movement history.
-   Stock valuation using a clearly defined costing method.
-   Inventory count and reconciliation.
-   Damaged, lost, or returned stock tracking.
-   IMEI/serial-level inventory views.
-   Stock alerts.

Never silently overwrite stock quantities. Record each movement with
actor, timestamp, reason, source, and affected branch.

## 6. Purchasing and Suppliers

**Supplier management**

-   Supplier profile and contact details.
-   Supplier reference and notes.
-   Purchase history.
-   Outstanding payable balance where supported.
-   Supplier status.

**Purchase management**

-   Create purchase orders.
-   Add products, variants, quantities, and unit costs.
-   Record supplier invoice/reference.
-   Record tax, shipping, and other purchase costs.
-   Receive full or partial deliveries.
-   Register IMEI/serial identifiers for tracked devices.
-   Update stock through auditable stock movements.
-   Track unpaid, partially paid, and paid supplier invoices.
-   Return goods to suppliers with reason and history.

## 7. Sales, Invoices, and Receipts

-   Sales history and searchable invoices.
-   Invoice number and transaction reference.
-   Customer and cashier details.
-   Item-level price and discount snapshots.
-   Tax and payment breakdown.
-   Printable receipt layout.
-   Download/share invoice where implemented.
-   Sale status and payment status.
-   Refund, void, and exchange history.
-   Branch and cashier filters.

Historical invoices must preserve the product name, SKU, unit price,
discount, tax, and other relevant values as they were at the time of
sale.

## 8. Returns, Exchanges, and Refunds

-   Find original sale by invoice, customer, barcode, or IMEI.
-   Validate return eligibility against configurable policy.
-   Select returned items and quantities.
-   Capture return reason and condition.
-   Decide whether stock returns to sellable, damaged, or repair stock.
-   Record exchange items and price difference.
-   Process refund through an authorized method.
-   Require elevated permission for exceptional cases.
-   Maintain complete audit history.

Never treat a returned device as available stock automatically. Its
condition and IMEI/serial status must be reviewed.

## 9. Warranty Management

-   Warranty policy by product or category.
-   Warranty start and end dates.
-   Warranty reference/certificate.
-   Link warranty to the exact sold device identifier.
-   Customer and invoice lookup.
-   Warranty claim status.
-   Repair/replacement/refund outcome.
-   Warranty exclusions and notes.
-   Expiry alerts where useful.

Warranty terms should be configurable and displayed clearly to
customers. Do not promise manufacturer warranty coverage unless the
business has verified it.

## 10. Repair and Service Management

A dedicated repair counter for mobile repair businesses.

**Repair intake**

-   Customer details.
-   Device brand/model.
-   IMEI or serial number when relevant.
-   Device condition and visible damage.
-   Customer-reported issue.
-   Accessories received with the device.
-   Device photos where supported.
-   Intake date and expected completion date.
-   Initial quotation and customer approval.

**Repair workflow**

-   Assign technician.
-   Record diagnosis.
-   Add parts and labor.
-   Update status: `RECEIVED`, `DIAGNOSING`, `WAITING_APPROVAL`,
    `IN_PROGRESS`, `WAITING_PARTS`, `READY`, `DELIVERED`, or
    `CANCELLED`.
-   Record repair notes and parts usage.
-   Track payment and balance.
-   Notify customer through configured channels.
-   Capture collection confirmation.

Device custody and customer privacy are important. Limit access to
device data and never request or store a customer's device passcode
unless there is a documented, necessary, secure business process.

## 11. Customer Management and CRM

-   Customer name and contact information.
-   Customer notes and consent preferences.
-   Purchase history.
-   Repair and warranty history.
-   Outstanding balance where supported.
-   Customer search by name, phone, invoice, or device identifier
    subject to permissions.
-   Customer tags and segments.
-   Loyalty points and rewards (planned).
-   Promotional communication preferences.

Collect only the customer data required for business operations. Respect
consent and applicable privacy requirements.

## 12. Expenses and Cash Management

**Expense tracking**

-   Expense category.
-   Amount and currency.
-   Branch.
-   Date and payment method.
-   Supplier/payee.
-   Reference and attachment.
-   Notes and creator.

**Cash management**

-   Cash drawer opening balance.
-   Cash in/out entries.
-   Shift sales totals.
-   Expected closing balance.
-   Counted closing balance.
-   Cash variance.
-   Manager review and approval.
-   Shift history.

## 13. Staff, Roles, and Shifts

-   Invite and deactivate staff.
-   Assign roles and branch access.
-   Permission-based access to POS, inventory, purchasing, repairs, and
    reports.
-   Cashier shift opening and closing.
-   Staff activity history.
-   Sales by cashier.
-   Technician workload and repair assignments.
-   Approval workflows for discounts, refunds, and stock adjustments.

Never share one login between employees. Sensitive actions should be
attributable to a real user account.

## 14. Reports and Analytics

**Sales reports** - Daily, weekly, monthly, and custom-period sales. -
Sales by branch, cashier, category, brand, and product. - Payment method
breakdown. - Discounts, refunds, and voids. - Average sale value.

**Inventory reports** - Stock on hand by branch. - Low-stock and
out-of-stock list. - Stock valuation and costing method. - Stock
movement history. - Dead/slow-moving stock. - IMEI/serial status report.

**Business reports** - Gross margin estimates based on recorded cost. -
Expenses and operating summaries. - Supplier payables. - Customer
balances where supported. - Repair revenue and parts usage. - Branch
comparison.

Reports must define date ranges, timezone, currency, tax treatment, cost
method, and whether refunds/voids are included. Do not label revenue as
profit.

## 15. Notifications and Automation

Optional integrations can provide:

-   Low-stock alerts.
-   Purchase receiving reminders.
-   Warranty expiry reminders.
-   Repair status updates.
-   Customer invoice/receipt messages.
-   Daily sales summaries.
-   Staff shift reminders.
-   Supplier payment reminders.

Use approved email, SMS, or WhatsApp providers. Keep notification
delivery status and provider references where appropriate. Do not expose
provider secrets in client code.

## 16. Multi-Branch and SaaS Platform Management

**Tenant features**

-   Business registration and onboarding.
-   Owner profile and business settings.
-   Branch creation and configuration.
-   Staff membership and branch assignments.
-   Branch-specific stock, sales, purchases, and expenses.
-   Centralized reports across authorized branches.
-   Branch transfers with traceable stock movements.

**Platform admin features (planned)**

-   Tenant approval and activation.
-   Tenant suspension and reactivation.
-   Subscription plans and feature entitlements.
-   Usage limits and billing integration.
-   Platform health and operational overview.
-   Support workflows with audited access.
-   Platform-level audit logs.

Platform administrators should not casually browse private tenant
business data. Exceptional support access must be authorized, limited,
and audited.

------------------------------------------------------------------------

## Roles and Permissions

Suggested roles are presets. Use a permission-based model so each tenant
can safely configure access.

  -----------------------------------------------------------------------
  Role                                Typical access
  ----------------------------------- -----------------------------------
  Platform Super Admin                SaaS configuration and tenant
                                      lifecycle

  Business Owner                      Full access to their business and
                                      authorized branches

  Business Admin                      Business operations and staff
                                      management

  Branch Manager                      Assigned branch operations and
                                      reports

  Cashier                             POS, sales, receipts, and permitted
                                      returns

  Inventory Manager                   Products, stock, transfers, and
                                      stock counts

  Purchase Manager                    Suppliers, purchase orders, and
                                      receiving

  Repair Technician                   Assigned repair jobs and parts
                                      usage

  Accountant                          Expenses, payments, reconciliation,
                                      and reports

  Custom Role                         Explicitly configured permissions
  -----------------------------------------------------------------------

### Authorization rules

-   Default to least privilege.
-   Check tenant membership and branch scope on every protected
    operation.
-   Enforce permissions on the server and in Firestore Rules where
    applicable.
-   Hiding a UI button is not security.
-   Require explicit permissions for refunds, voids, discounts, and
    stock adjustments.
-   Record sensitive actions in audit logs.
-   Never trust a role or tenant ID supplied only by the browser.

------------------------------------------------------------------------

## Core Business Workflows

### Product receiving

1.  Purchase manager creates a purchase order.
2.  Supplier and expected products/variants are recorded.
3.  Staff receive and verify the shipment.
4.  IMEI/serial identifiers are captured for tracked devices.
5.  Received quantities and costs are validated.
6.  Stock movement records are created.
7.  Supplier invoice/payment status is updated.

### Device sale

1.  Cashier searches or scans the product.
2.  System loads the correct variant and available stock.
3.  Cashier selects the exact IMEI/serial for tracked devices.
4.  Customer and warranty details are captured where required.
5.  System recalculates price, discount, tax, and total.
6.  Payment is recorded and verified.
7.  Sale is finalized atomically.
8.  Stock/IMEI status changes to sold.
9.  Invoice/receipt is generated.

### Return or exchange

1.  Staff find the original sale.
2.  System checks item and return eligibility.
3.  Staff select the item and record the reason/condition.
4.  Authorized manager approves exceptions.
5.  Returned stock is assigned an appropriate condition/status.
6.  Refund or exchange difference is recorded.
7.  Original sale and return remain linked in history.

### Repair intake and delivery

1.  Staff create a repair job and capture device condition.
2.  Customer approves the initial quotation or diagnosis process.
3.  Technician is assigned.
4.  Diagnosis, parts, labor, and status updates are recorded.
5.  Customer is notified when ready if messaging is enabled.
6.  Payment/balance is settled.
7.  Device collection is confirmed and job is closed.

### Branch stock transfer

1.  Authorized staff create a transfer request.
2.  Source branch reserves the selected stock/identifiers.
3.  Transfer is dispatched and tracked.
4.  Destination branch verifies received quantities and identifiers.
5.  Stock ownership/location is updated.
6.  Transfer is closed with an audit record.

### End-of-shift reconciliation

1.  Cashier opens a shift with an opening balance.
2.  Sales and cash movements are recorded during the shift.
3.  Cashier counts closing cash.
4.  System calculates expected cash and variance.
5.  Manager reviews discrepancies.
6.  Shift is closed and retained as an audit record.

------------------------------------------------------------------------

## Data Model and Firestore Structure

The following is a logical starting point. Adapt collection placement to
actual query patterns, security rules, and data growth.

### Suggested collection structure

``` text
tenants/{tenantId}
  branches/{branchId}
  members/{userId}
  invitations/{invitationId}
  roles/{roleId}
  categories/{categoryId}
  brands/{brandId}
  products/{productId}
  variants/{variantId}
  stockItems/{stockItemId}
  stockMovements/{movementId}
  suppliers/{supplierId}
  purchaseOrders/{purchaseOrderId}
  customers/{customerId}
  sales/{saleId}
  returns/{returnId}
  payments/{paymentId}
  warranties/{warrantyId}
  repairJobs/{repairJobId}
  expenses/{expenseId}
  shifts/{shiftId}
  auditLogs/{logId}
  settings/{documentId}

platformUsers/{userId}
platformAuditLogs/{logId}
```

For high-volume collections, top-level tenant-scoped collections may be
more appropriate than deeply nested documents. Choose the layout based
on query patterns and security-rule design.

### Common document fields

``` js
{
  tenantId: "tenant_id",
  branchId: "branch_id", // when branch-scoped
  status: "ACTIVE",
  createdAt: serverTimestamp(),
  createdBy: "user_id",
  updatedAt: serverTimestamp(),
  updatedBy: "user_id"
}
```

### Product concept

``` js
{
  tenantId: "tenant_id",
  name: "Example Smartphone",
  brandId: "brand_id",
  categoryId: "category_id",
  sku: "PHONE-001",
  trackingMode: "IMEI",
  variants: [
    {
      variantId: "variant_id",
      color: "Black",
      storage: "128GB",
      costPriceMinor: 4500000,
      sellingPriceMinor: 5200000
    }
  ],
  isActive: true
}
```

### Stock item concept

``` js
{
  tenantId: "tenant_id",
  branchId: "branch_id",
  productId: "product_id",
  variantId: "variant_id",
  trackingType: "IMEI",
  imei1: "example-imei-1",
  imei2: "example-imei-2",
  serialNumber: null,
  status: "IN_STOCK",
  purchaseId: "purchase_id",
  createdAt: "server timestamp"
}
```

Use suitable validation and access restrictions for device identifiers.
Avoid exposing unnecessary identifiers in public pages or broad reports.

### Sale concept

``` js
{
  tenantId: "tenant_id",
  branchId: "branch_id",
  invoiceNumber: "INV-000102",
  customerId: "customer_id",
  items: [
    {
      productId: "product_id",
      variantId: "variant_id",
      stockItemId: "stock_item_id",
      nameSnapshot: "Example Smartphone 128GB",
      skuSnapshot: "PHONE-001",
      quantity: 1,
      unitPriceMinor: 5200000,
      discountMinor: 0,
      costSnapshotMinor: 4500000
    }
  ],
  subtotalMinor: 5200000,
  discountMinor: 0,
  taxMinor: 0,
  totalMinor: 5200000,
  paymentStatus: "PAID",
  saleStatus: "COMPLETED",
  createdAt: "server timestamp",
  createdBy: "user_id"
}
```

Use integer minor currency units (for example, paisa where the currency
supports it) or another explicitly defined decimal strategy. Never rely
on floating-point arithmetic for money. Store historical snapshots so
later product edits do not rewrite old invoices.

### Data integrity guidelines

-   Enforce uniqueness for IMEI/serial identifiers within the correct
    tenant scope.
-   Prevent a sold stock item from being sold again.
-   Use transactions or carefully designed atomic operations for sales
    and stock changes.
-   Make payment webhooks and retryable operations idempotent.
-   Keep financial and stock movement history append-only where
    practical.
-   Define Firestore indexes for actual query patterns.
-   Avoid unbounded arrays and oversized documents.
-   Plan archival and retention policies for high-volume data.

------------------------------------------------------------------------

## UI/UX Standards

### Page standards

Every page should provide:

-   Clear title and short description.
-   Primary action where relevant.
-   Loading, empty, error, and success states.
-   Responsive layout.
-   Permission-aware controls.
-   Helpful validation and error messages.
-   Consistent spacing and component patterns.

### Tables and lists

-   Search, filtering, sorting, and pagination.
-   Useful column visibility controls for dense screens.
-   Clear stock, payment, and job status labels.
-   Mobile-friendly alternative layouts.
-   Safe bulk actions with confirmation.
-   Keyboard-accessible row actions.

### Forms

-   React Hook Form and Zod.
-   Clear required and optional fields.
-   Inline validation.
-   Server error feedback.
-   Disabled/loading submit states.
-   Duplicate-submission prevention.
-   Safe preservation of entered values when dialogs open.

### Status language

Use consistent status values and labels across the application:

-   Active / Inactive
-   In stock / Low stock / Out of stock
-   Reserved / Sold / Returned / Damaged
-   Draft / Pending / Completed / Cancelled
-   Paid / Unpaid / Partially paid / Refunded
-   Received / Diagnosing / In progress / Ready / Delivered

Do not rely on color alone; pair colors with text and/or icons.

------------------------------------------------------------------------

## Security and Data Protection

Security is a core product requirement.

-   Firebase Authentication for user identity.
-   Firestore Security Rules for client data access.
-   Firebase Admin SDK for trusted server-side operations.
-   Firebase App Check where supported.
-   Server-side validation for sensitive mutations.
-   Zod schemas for untrusted input.
-   Tenant and branch authorization on every protected operation.
-   Rate limiting for public and authentication-adjacent endpoints.
-   Secure HTTP-only sessions where custom sessions are used.
-   Environment variables for secrets.
-   Audit logs for financial, inventory, and permission changes.
-   Backups and documented recovery procedures.
-   Structured logs and production error monitoring.
-   Safe user-facing errors that do not expose internal secrets.

### Financial and stock safeguards

-   Never trust totals calculated only in the browser.
-   Revalidate stock and IMEI status before finalizing a sale.
-   Verify payment-provider webhooks on the server.
-   Verify webhook signatures and prevent duplicate processing.
-   Restrict edits to completed sales and closed shifts.
-   Require permission and a reason for refunds, voids, and stock
    adjustments.
-   Never store raw payment card numbers or CVV.
-   Protect customer contact details and device identifiers according to
    role.

------------------------------------------------------------------------

## Offline and Sync Strategy

Retail counters may have unreliable internet connectivity. The system
should handle supported offline scenarios safely.

**Planned approach**

-   Cache permitted product/catalog data locally.
-   Use IndexedDB with Dexie for local operational data and queued
    actions.
-   Show online, offline, syncing, and sync-failed states.
-   Assign stable client-generated operation IDs.
-   Retry supported operations safely when connectivity returns.
-   Reconcile stock and pricing with the server before finalizing
    critical sales.
-   Display conflicts that require staff intervention.
-   Avoid silently overwriting server changes.

**Important:** Offline capability must be implemented and tested per
workflow. Do not claim fully offline POS or payment support until
queueing, conflict resolution, payment behavior, and recovery have been
verified.

------------------------------------------------------------------------

## Project Structure

Suggested feature-oriented structure:

``` text
mobile-shop-os/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── pos/
│   ├── inventory/
│   ├── repairs/
│   ├── api/
│   ├── layout.js
│   └── globals.css
├── components/
│   ├── ui/
│   ├── shared/
│   ├── layout/
│   ├── dashboard/
│   └── marketing/
├── features/
│   ├── auth/
│   ├── tenants/
│   ├── branches/
│   ├── products/
│   ├── inventory/
│   ├── imei/
│   ├── pos/
│   ├── sales/
│   ├── purchases/
│   ├── suppliers/
│   ├── customers/
│   ├── returns/
│   ├── warranties/
│   ├── repairs/
│   ├── expenses/
│   ├── staff/
│   └── reports/
├── lib/
│   ├── firebase/
│   ├── auth/
│   ├── security/
│   ├── validation/
│   ├── services/
│   └── utils/
├── hooks/
├── store/
├── config/
├── public/
├── tests/
├── scripts/
├── .env.example
├── firestore.rules
├── firestore.indexes.json
├── package.json
└── README.md
```

Adapt this structure to the existing repository rather than moving files
just to match the example. Keep feature-specific components, schemas,
and services close to their feature.

------------------------------------------------------------------------

## Getting Started

### Prerequisites

-   Node.js version supported by the installed Next.js release.
-   npm.
-   Firebase project with Authentication and Cloud Firestore enabled.
-   Firebase Storage if product images or document uploads are enabled.
-   Firebase Admin credentials for trusted server operations.
-   Git.

### Installation

``` bash
git clone <your-repository-url>
cd mobile-shop-os
npm install
```

Create a local environment file:

``` bash
cp .env.example .env.local
```

Add the Firebase and application configuration, then run:

``` bash
npm run dev
```

Open `http://localhost:3000`.

Use the package manager and scripts already defined by the repository.
Do not mix npm, pnpm, and yarn lockfiles.

------------------------------------------------------------------------

## Environment Variables

Document variable names in `.env.example`, never real secrets.

Example categories (adjust names to match the actual Firebase
initialization code):

``` env
# Public Firebase web configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-only Firebase Admin configuration
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Public application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional integrations — only when implemented
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENTRY_DSN=
```

Notes:

-   `NEXT_PUBLIC_` variables are visible to the browser.
-   Keep Admin SDK credentials and payment secrets server-only.
-   Handle private-key newline formatting according to the Admin SDK
    initialization code.
-   Never commit `.env.local` or production credentials.
-   Remove unused variables from deployment configuration when
    integrations are not enabled.

------------------------------------------------------------------------

## Development Commands

Confirm actual script names in `package.json`.

``` bash
npm run dev       # Start local development
npm run build     # Create a production build
npm run start     # Run the production build locally
npm run lint      # Run lint checks
npm run test      # Run unit/component tests, if configured
npm run test:e2e  # Run Playwright tests, if configured
```

Before submitting a change:

1.  Run lint and relevant tests.
2.  Run a production build.
3.  Test the affected workflow using the correct role.
4.  Check desktop, tablet, and mobile layouts.
5.  Verify loading, empty, error, and permission-denied states.

------------------------------------------------------------------------

## Testing and Quality

Prioritize business-critical behavior.

### Unit tests

-   Money, tax, discount, and margin calculations.
-   IMEI/serial normalization and validation.
-   Stock availability calculations.
-   Sale and return calculations.
-   Permission checks.
-   Warranty date and eligibility rules.
-   Repair status transitions.
-   Purchase receiving calculations.

### Integration tests

-   Authentication and tenant membership.
-   Branch-scoped Firestore access.
-   Sale creation and stock deduction.
-   Duplicate IMEI prevention.
-   Return and stock condition handling.
-   Purchase receiving and stock movements.
-   Payment webhook idempotency.
-   Repair job and parts usage.

### End-to-end tests

-   Owner signs in and creates a branch.
-   Admin adds a product and variant.
-   Inventory manager receives a tracked phone with IMEI.
-   Cashier sells the exact device and generates an invoice.
-   System prevents the same IMEI from being sold again.
-   Staff processes a return with correct approval.
-   Technician updates a repair job.
-   Manager views branch sales and stock reports.
-   User from one tenant cannot access another tenant's records.

Use test accounts and synthetic data. Never use real customer
information or production payment credentials in automated tests.

------------------------------------------------------------------------

## Deployment

### Recommended deployment flow

1.  Use separate development, staging, and production Firebase projects
    where practical.
2.  Configure environment variables in the hosting platform.
3.  Review and deploy Firestore Security Rules and indexes.
4.  Run the production build.
5.  Deploy the Next.js application to Vercel or the chosen host.
6.  Configure the production domain and HTTPS.
7.  Configure payment/notification webhooks only when those integrations
    are implemented.
8.  Verify authentication, tenant isolation, and critical retail
    workflows.
9.  Enable monitoring and backup procedures.

### Production checklist

-   [ ] Production environment variables configured.
-   [ ] No secrets committed to Git.
-   [ ] Firestore rules reviewed and deployed.
-   [ ] Required indexes deployed.
-   [ ] Tenant and branch authorization tested.
-   [ ] Duplicate IMEI/serial protection tested.
-   [ ] Sale and stock updates are atomic/idempotent.
-   [ ] Admin SDK restricted to server code.
-   [ ] App Check configured where appropriate.
-   [ ] Authentication and recovery tested.
-   [ ] Payment webhooks verified, if enabled.
-   [ ] Backups and recovery process documented.
-   [ ] Error monitoring configured.
-   [ ] Privacy and data-retention requirements reviewed.
-   [ ] POS and repair workflows tested on target devices.

------------------------------------------------------------------------

## Development Roadmap

Build a dependable retail core before expanding into advanced SaaS
features.

### Phase 1 --- Foundation and Authentication

-   [ ] Next.js application shell and design system.
-   [ ] Firebase client and Admin SDK setup.
-   [ ] Authentication and protected routes.
-   [ ] Tenant onboarding and membership model.
-   [ ] Branch model and branch selector.
-   [ ] Roles, permissions, and Firestore Rules.
-   [ ] Loading, empty, error, and not-found states.

### Phase 2 --- Product Catalog and Inventory

-   [ ] Categories and brands.
-   [ ] Product and variant management.
-   [ ] Product image uploads.
-   [ ] SKU and barcode support.
-   [ ] IMEI/serial tracking.
-   [ ] Branch stock overview.
-   [ ] Stock movements and adjustments.
-   [ ] Low-stock alerts.

### Phase 3 --- POS and Sales

-   [ ] Product search and scanner workflow.
-   [ ] Cart and checkout.
-   [ ] IMEI/serial selection.
-   [ ] Discounts and tax calculation.
-   [ ] Payment recording.
-   [ ] Invoice and receipt generation.
-   [ ] Sales history.
-   [ ] Returns and exchanges.

### Phase 4 --- Purchasing and Business Operations

-   [ ] Supplier management.
-   [ ] Purchase orders and receiving.
-   [ ] Branch stock transfers.
-   [ ] Customer management.
-   [ ] Warranty tracking.
-   [ ] Repair desk and technician workflow.
-   [ ] Staff shifts and cash management.
-   [ ] Expenses.

### Phase 5 --- Reporting and Reliability

-   [ ] Sales and inventory reports.
-   [ ] Profit/margin reporting with defined cost method.
-   [ ] Branch comparison.
-   [ ] Offline cache and sync queue.
-   [ ] Conflict handling and recovery.
-   [ ] Automated tests for critical workflows.
-   [ ] Monitoring, backups, and recovery drills.
-   [ ] Payment and notification integrations.

### Phase 6 --- Multi-Tenant SaaS Expansion

-   [ ] Platform admin console.
-   [ ] Tenant approval and lifecycle controls.
-   [ ] Subscription plans and feature entitlements.
-   [ ] Usage tracking and billing.
-   [ ] Advanced staff permissions.
-   [ ] Customer loyalty and CRM automation.
-   [ ] Advanced analytics and exports.
-   [ ] Optional supplier/customer portals.

------------------------------------------------------------------------

## Product and Engineering Principles

1.  **Accuracy first:** sales, payments, stock, and device identifiers
    must remain correct.
2.  **Fast checkout:** reduce friction for staff at the counter.
3.  **Traceability:** every important stock and financial change needs a
    history.
4.  **Tenant isolation:** one business must never access another
    business's data.
5.  **Least privilege:** staff see only the information required for
    their work.
6.  **Graceful recovery:** network and provider failures must not create
    duplicate sales or corrupt stock.
7.  **Responsive by default:** support real shop devices and screen
    sizes.
8.  **Honest feature status:** planned features are not described as
    completed.
9.  **Maintainable architecture:** keep business rules out of
    presentation components.
10. **Customer privacy:** collect and expose only the data needed for
    the workflow.

------------------------------------------------------------------------

## License

Add an explicit license before distributing this project publicly or
commercially. Until a license is added, do not assume others have
permission to reuse, modify, or redistribute the code.
