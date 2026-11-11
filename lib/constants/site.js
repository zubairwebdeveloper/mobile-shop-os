export const SITE = {
  name: "ZUBAIR MOBILE",
  shortName: "Zubair Mobile",
  tagline: "Buy Smarter. Sell Faster. Manage Everything.",
  description:
    "Pakistan's premium destination for genuine smartphones, accessories and expert repairs. Smart shopping powered by AI.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  currency: "PKR",
  locale: "en-PK",
  // Placeholder contact info - Phase 02 mein real store settings se aayegi.
  contact: {
    phone: "+92 300 0000000",
    email: "support@zubairmobile.example",
    address: "Main Bazaar, Pakistan",
  },
};

export const ANNOUNCEMENT = {
  text: "Free nationwide delivery on orders above Rs. 25,000",
  cta: { label: "Shop deals", href: "/deals" },
};
