import { ArrowLeftRight, Bell, CalendarClock, ClipboardCheck, ClipboardList, Fingerprint, Boxes, Globe, LayoutDashboard, MessageCircle, Receipt, RefreshCcw, ScrollText, Settings, ShieldCheck, ShoppingCart, Smartphone, Sparkles, Store, Tags, TrendingUp, Truck, Undo2, UserCog, Users, UsersRound, Wallet, Wrench } from "lucide-react";

/**
 * Single source of truth for dashboard navigation, breadcrumbs, command menu
 * and the "coming soon" placeholder pages.
 * `phase` = roadmap phase in which the module is actually built.
 * Items with `available: false` open a placeholder page, not a fake module.
 */
export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, available: true },
    ],
  },
  {
    label: "Sell",
    items: [
      { label: "POS", href: "/dashboard/pos", icon: ShoppingCart, available: true, description: "Fast touch-friendly point of sale with split payments and invoices." },
      { label: "Sales", href: "/dashboard/sales", icon: Receipt, available: true, description: "Invoices and sales history." },
      { label: "Returns", href: "/dashboard/returns", icon: Undo2, available: true, description: "Returns and refund records." },
      { label: "Exchanges", href: "/dashboard/exchanges", icon: RefreshCcw, available: true, description: "Exchange credit from returns." },
      { label: "Daily closing", href: "/dashboard/daily-closing", icon: ClipboardCheck, available: true, description: "Cash drawer reconciliation." },
    ],
  },
  {
    label: "Catalogue and stock",
    items: [
      { label: "Products", href: "/dashboard/products", icon: Smartphone, available: true, description: "Product catalogue, variants and pricing." },
      { label: "Categories and brands", href: "/dashboard/catalogue", icon: Tags, available: true, description: "Categories, brands and IMEI tracking switches." },
      { label: "IMEI", href: "/dashboard/imei", icon: Fingerprint, available: true, description: "IMEI and device records with barcode lookup." },
      { label: "Inventory", href: "/dashboard/inventory", icon: Boxes, available: true, description: "Branch-wise stock, adjustments and low-stock alerts." },
      { label: "Stock movements", href: "/dashboard/stock-movements", icon: ArrowLeftRight, available: true, description: "Traceable stock history." },
      { label: "Branch transfers", href: "/dashboard/transfers", icon: ArrowLeftRight, available: true, description: "Move stock between branches." },
      { label: "Purchases", href: "/dashboard/purchases", icon: ClipboardList, available: true, description: "Purchase orders and goods receiving." },
      { label: "Suppliers", href: "/dashboard/suppliers", icon: Truck, available: true, description: "Supplier records." },
    ],
  },
  {
    label: "Customers and service",
    items: [
      { label: "Customers", href: "/dashboard/customers", icon: Users, available: true, description: "Customer CRM and history." },
      { label: "Warranties", href: "/dashboard/warranties", icon: ShieldCheck, available: true, description: "Warranty registration and claims." },
      { label: "Repairs", href: "/dashboard/repairs", icon: Wrench, available: true, description: "Repair jobs and tracking." },
      { label: "Installments", href: "/dashboard/installments", icon: CalendarClock, available: true, description: "Installment plans and collections." },
      { label: "Trade-in", href: "/dashboard/trade-in", icon: RefreshCcw, phase: 12, description: "Used device buying and resale." },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Finance", href: "/dashboard/finance", icon: Wallet, available: true, description: "Revenue, profit, cash movement and balances." },
      { label: "Expenses", href: "/dashboard/expenses", icon: Receipt, available: true, description: "Rent, salaries, bills and other costs." },
      { label: "Payables", href: "/dashboard/payables", icon: Truck, available: true, description: "What you owe suppliers." },
      { label: "Reconciliation", href: "/dashboard/reconciliation", icon: ClipboardCheck, available: true, description: "Compare records with a bank or wallet statement." },
      { label: "Analytics", href: "/dashboard/analytics", icon: TrendingUp, phase: 13, description: "Sales and performance analytics." },
      { label: "Employees", href: "/dashboard/employees", icon: UserCog, available: true, description: "Staff, attendance, leave and commission." },
      { label: "Performance", href: "/dashboard/performance", icon: TrendingUp, available: true, description: "Branch and staff sales performance." },
      { label: "Branches", href: "/dashboard/branches", icon: Store, available: true, description: "Branch management." },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: Sparkles, phase: 13, description: "Tenant-scoped AI business assistant." },
      { label: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageCircle, phase: 14, description: "Customer communication automation." },
      { label: "Online store", href: "/dashboard/online-store", icon: Globe, phase: 15, description: "Shop-branded storefront and orders." },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell, available: true, description: "Low-stock alerts." },
      { label: "Team", href: "/dashboard/team", icon: UsersRound, available: true, description: "Team members, roles and invitations." },
      { label: "Audit logs", href: "/dashboard/audit-logs", icon: ScrollText, available: true, description: "Who did what and when." },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, available: true, description: "Shop profile and timezone." },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export function findNavItem(href) {
  return NAV_ITEMS.find((item) => item.href === href) ?? null;
}

export function isNavActive(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
