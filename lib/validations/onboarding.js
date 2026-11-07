import { z } from "zod";
import { isValidSlug } from "./slug";

/**
 * Shared by the browser forms (instant feedback) AND the API routes (the real check).
 * The server never trusts that the browser ran this.
 */

const required = (min, max, label) =>
  z.string().trim().min(min, `${label} is required`).max(max, `${label} is too long`);

const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{5,18}[0-9]$/;
const phone = z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number");

const optionalPhone = z
  .string()
  .trim()
  .max(25, "Phone number is too long")
  .default("")
  .refine((value) => value === "" || PHONE_PATTERN.test(value), "Enter a valid phone number");

export const applicationSchema = z.object({
  shopName: required(2, 80, "Shop name"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      isValidSlug,
      "Use 3-40 lowercase letters, numbers and single hyphens. Some names are reserved."
    ),
  ownerName: required(2, 80, "Owner name"),
  phone,
  city: required(2, 60, "City"),
  address: required(5, 200, "Address"),
  expectedBranches: z.coerce.number().int("Enter a whole number").min(1, "At least 1").max(50, "At most 50"),
});

export const decisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().max(500, "Reason is too long").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "REJECT" && (value.reason ?? "").length < 3) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Give the applicant a reason (at least 3 characters)" });
    }
  });

// Form used by the reviewer when rejecting (the decision itself is fixed by the button)
export const rejectionFormSchema = z.object({
  reason: required(3, 500, "Reason"),
});

export const branchSchema = z.object({
  name: required(2, 80, "Branch name"),
  address: z.string().trim().max(200, "Address is too long").default(""),
  phone: optionalPhone,
});
