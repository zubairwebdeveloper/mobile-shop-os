import Link from "next/link";
import {
  ArrowRight,
  Store,
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Store,
    title: "Multi-Store Management",
    description:
      "Manage multiple stores and branches from one centralized platform.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description:
      "Track products, stock levels, transfers and low-stock alerts.",
  },
  {
    icon: ShoppingCart,
    title: "Sales & Orders",
    description:
      "Manage daily sales, orders, invoices and transactions efficiently.",
  },
  {
    icon: Users,
    title: "Staff Management",
    description:
      "Manage employees, roles, permissions and branch-level access.",
  },
  {
    icon: BarChart3,
    title: "Business Analytics",
    description:
      "Understand business performance with reports and useful insights.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Workspace",
    description:
      "Keep your business data protected with role-based access control.",
  },
];

const benefits = [
  "Centralized business management",
  "Multiple branches under one account",
  "Real-time inventory visibility",
  "Role-based staff permissions",
  "Sales and business reporting",
  "Secure cloud-based workspace",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Store className="size-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">MSOS</span>
              <p className="text-[10px] font-medium tracking-widest text-muted-foreground">
                BUSINESS MANAGEMENT
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition hover:text-foreground">
              Features
            </a>
            <a href="#benefits" className="transition hover:text-foreground">
              Benefits
            </a>
            <a href="#about" className="transition hover:text-foreground">
              About
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold transition hover:bg-muted sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/apply"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 py-24 sm:px-8 sm:py-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />

        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-xs font-semibold">
              <Zap className="size-3.5 text-primary" />
              <span>One platform. Complete business control.</span>
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Run your entire business from{" "}
              <span className="text-primary">one platform.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Manage stores, branches, inventory, sales and employees with one
              powerful business management system built to simplify your
              operations and support your growth.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/apply"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition hover:-translate-y-0.5 hover:opacity-90"
              >
                Apply for your shop
                <ArrowRight className="size-4" />
              </Link>

              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-xl border px-6 text-sm font-semibold transition hover:bg-muted"
              >
                Explore workspace
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Centralized management
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Secure access
              </span>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="rounded-2xl border bg-card p-4 shadow-2xl shadow-black/5 sm:p-6">
              <div className="flex items-center justify-between border-b pb-5">
                <div>
                  <p className="text-sm font-bold">Business Overview</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your management workspace
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Dashboard
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 py-5">
                {[
                  { label: "Total Branches", value: "Manage all" },
                  { label: "Inventory", value: "Track stock" },
                  { label: "Sales", value: "Monitor revenue" },
                  { label: "Employees", value: "Manage team" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border bg-muted/30 p-4"
                  >
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">Business Operations</p>
                  <BarChart3 className="size-4 text-primary" />
                </div>

                <div className="flex h-28 items-end gap-3">
                  {[35, 55, 42, 78, 60, 90, 72, 100, 68, 85, 58, 95].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-primary/70 transition-all hover:bg-primary"
                        style={{ height: `${height}%` }}
                      />
                    ),
                  )}
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Illustrative dashboard preview
                </p>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-5 hidden items-center gap-3 rounded-xl border bg-background p-4 shadow-xl sm:flex">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">Secure Workspace</p>
                <p className="text-xs text-muted-foreground">
                  Role-based access
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-y bg-muted/20 px-5 py-24 sm:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Powerful Features
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your business needs
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              All your essential business operations, connected in one
              centralized management platform.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border bg-card p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5"
                >
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-6" />
                  </div>

                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Built for business growth
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Less complexity. More control.
            </h2>
            <p className="mt-5 max-w-xl leading-8 text-muted-foreground">
              Stop managing your business through disconnected tools. Bring your
              operations together and make better decisions with a centralized
              workspace.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            id="about"
            className="rounded-3xl border bg-muted/30 p-8 sm:p-12"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Store className="size-7" />
            </div>
            <h3 className="mt-7 text-2xl font-bold">
              Your business. One workspace.
            </h3>
            <p className="mt-4 leading-8 text-muted-foreground">
              From a single shop to multiple branches, MSOS gives your team the
              tools to manage everyday operations with clarity and confidence.
            </p>
            <Link
              href="/apply"
              className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3"
            >
              Start your application
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-primary px-7 py-16 text-center text-primary-foreground sm:px-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to manage your business smarter?
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-7 opacity-85">
            Apply for your shop and get started with a centralized business
            management experience.
          </p>
          <Link
            href="/apply"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-background px-6 text-sm font-bold text-foreground transition hover:opacity-90"
          >
            Apply for your shop
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} MSOS. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/apply" className="hover:text-foreground">
              Apply
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
