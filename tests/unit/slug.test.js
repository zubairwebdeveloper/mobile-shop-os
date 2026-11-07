import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS, isValidSlug, normalizeSlug } from "@/lib/validations/slug";

describe("normalizeSlug", () => {
  it("turns a shop name into a slug", () => {
    expect(normalizeSlug("Smart Mobile Hub")).toBe("smart-mobile-hub");
    expect(normalizeSlug("  Tech   Zone!! Mobiles  ")).toBe("tech-zone-mobiles");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(normalizeSlug("---")).toBe("");
    expect(normalizeSlug("")).toBe("");
    expect(normalizeSlug(undefined)).toBe("");
    expect(normalizeSlug("موبائل")).toBe("");
  });

  it("never exceeds 40 characters or ends with a hyphen", () => {
    const slug = normalizeSlug("a".repeat(39) + " b cdef ghi");
    expect(slug.length <= 40).toBe(true);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it("accepts well-formed slugs", () => {
    expect(isValidSlug("smart-mobile-hub")).toBe(true);
    expect(isValidSlug("abc")).toBe(true);
    expect(isValidSlug("123")).toBe(true);
    expect(isValidSlug("a".repeat(40))).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("a".repeat(41))).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });

  it("rejects bad characters and hyphen placement", () => {
    for (const bad of ["Admin1", "-abc", "abc-", "a--b", "abc_def", "abc/def", "abc def", "abc.def", "../x"]) {
      expect(isValidSlug(bad)).toBe(false);
    }
  });

  it("rejects non-strings", () => {
    expect(isValidSlug(123)).toBe(false);
    expect(isValidSlug(null)).toBe(false);
    expect(isValidSlug(undefined)).toBe(false);
  });

  it("rejects every reserved name that is otherwise well-formed", () => {
    for (const reserved of RESERVED_SLUGS) {
      expect(isValidSlug(reserved)).toBe(false);
    }
    expect(isValidSlug("admin")).toBe(false);
    expect(isValidSlug("platform")).toBe(false);
  });
});
