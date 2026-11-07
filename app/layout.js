import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Restaurant OS | Restaurant Management System",
    template: "%s | Restaurant OS",
  },
  description:
    "Manage restaurant operations, orders, inventory, branches, staff, sales and finances with Restaurant OS.",
  applicationName: "Restaurant OS",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
    >
      <body className="min-h-screen w-full overflow-x-hidden bg-background font-sans text-foreground">
        <main className="flex min-h-screen w-full flex-1 flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
