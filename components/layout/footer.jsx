import Link from "next/link";
import { connection } from "next/server";
import { Mail, MapPin, Phone, ArrowUpRight } from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";

import { FOOTER_NAV } from "@/lib/constants/navigation";
import { SITE } from "@/lib/constants/site";
import { Logo } from "@/components/shared/logo";
import { Separator } from "@/components/ui/separator";

const SOCIALS = [
  { label: "Facebook", href: "#", icon: FaFacebookF },
  { label: "Instagram", href: "#", icon: FaInstagram },
  { label: "WhatsApp", href: "#", icon: FaWhatsapp },
  { label: "YouTube", href: "#", icon: FaYoutube },
];

export async function Footer() {
  await connection();

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-20 overflow-hidden bg-brand-dark text-white sm:mt-24">
      {/* Decorative Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-primary/10 blur-[100px]"
      />

      <div className="container-page relative">
        {/* Main Footer */}
        <div className="grid gap-12 py-14 sm:py-16 lg:grid-cols-[1.2fr_2fr] lg:gap-16 lg:py-20">
          {/* Brand Information */}
          <div className="space-y-6">
            <Logo onDark />

            <p className="max-w-sm text-sm leading-7 text-white/60">
              {SITE.description}
            </p>

            {/* Contact Information */}
            <ul className="space-y-4 pt-2 text-sm text-white/70">
              <li className="group flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-accent transition-transform duration-300 group-hover:rotate-12" />
                <span className="transition-colors duration-300 group-hover:text-white">
                  {SITE.contact.phone}
                </span>
              </li>

              <li className="group flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-accent transition-transform duration-300 group-hover:-translate-y-0.5" />
                <span className="break-all transition-colors duration-300 group-hover:text-white">
                  {SITE.contact.email}
                </span>
              </li>

              <li className="group flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent transition-transform duration-300 group-hover:-translate-y-0.5" />
                <span className="transition-colors duration-300 group-hover:text-white">
                  {SITE.contact.address}
                </span>
              </li>
            </ul>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-8">
            {FOOTER_NAV.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="mb-5 font-heading text-sm font-bold tracking-wide text-white">
                  {group.title}
                </h2>

                <ul className="space-y-3.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group/link relative inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors duration-300 hover:text-white focus-visible:text-white focus-visible:outline-none"
                      >
                        <span className="relative">
                          {link.label}

                          {/* Animated Underline */}
                          <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover/link:scale-x-100 group-focus-visible/link:scale-x-100" />
                        </span>

                        {/* Animated Arrow */}
                        <ArrowUpRight className="size-3.5 shrink-0 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover/link:translate-x-0 group-hover/link:translate-y-0 group-hover/link:opacity-100 group-focus-visible/link:translate-x-0 group-focus-visible/link:translate-y-0 group-focus-visible/link:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <Separator className="bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-5 py-7 text-center sm:flex-row sm:text-left">
          {/* Copyright */}
          <p className="text-xs leading-relaxed text-white/45">
            &copy; {currentYear} {SITE.name}. All rights reserved.
          </p>

          {/* Social Links */}
          <ul className="flex items-center gap-2.5">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  className="group/social grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/65 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Icon className="size-4 transition-transform duration-300 group-hover/social:scale-110" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
