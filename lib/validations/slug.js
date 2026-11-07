/**
 * Shop "slug" = the unique public address of a tenant (used later for the storefront URL).
 * Pure JS, no dependencies, relative imports only so it is trivially unit-testable.
 */

// Paths and names that must never be claimed by a shop.
export const RESERVED_SLUGS = Object.freeze([
  "about", "admin", "api", "app", "auth", "billing", "blog", "contact", "customer", "dashboard",
  "demo", "docs", "features", "forgot-password", "help", "login", "logout", "onboarding", "platform",
  "pricing", "privacy", "register", "root", "s", "settings", "solutions", "static", "store",
  "support", "terms", "verify-email", "www",
]);

// 3-40 chars: lowercase letters, digits, single hyphens inside; must start and end with letter/digit.
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** Suggests a slug from a shop name. The result may still be invalid (e.g. reserved or too short). */
export function normalizeSlug(input) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug) {
  return (
    typeof slug === "string" &&
    SLUG_PATTERN.test(slug) &&
    !slug.includes("--") &&
    !RESERVED_SLUGS.includes(slug)
  );
}
