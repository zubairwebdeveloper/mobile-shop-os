import { Inter, Manrope, Space_Grotesk } from "next/font/google";

import "./globals.css";

import { AppProviders } from "@/providers/app-providers";
import { SITE } from "@/lib/constants/site";
import { cn } from "@/lib/utils";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
});

export const metadata = {
  metadataBase: new URL(SITE.url),

  title: {
    default: `${SITE.name} | ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },

  description: SITE.description,

  applicationName: SITE.name,

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title: `${SITE.name} | ${SITE.tagline}`,
    description: SITE.description,
    siteName: SITE.name,
    url: SITE.url,
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} | ${SITE.tagline}`,
    description: SITE.description,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#F4F6FA",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#0B1220",
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(manrope.variable, inter.variable, spaceGrotesk.variable)}
    >
      <body className="min-h-dvh flex flex-col antialiased">
        <AppProviders>
          <Navbar />

          <main className="flex-1 w-full min-w-0">{children}</main>

          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
