import { z } from "zod";
import { isSafeId } from "../security/ids.js";

const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{5,18}[0-9]$/;

const required = (min, max, label) =>
  z.string().trim().min(min, `${label} is required`).max(max, `${label} is too long`);

export function isValidTimezone(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 60) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Roles an owner may hand out. OWNER is deliberately not assignable (no ownership transfer yet). */
export const ASSIGNABLE_ROLES = ["MANAGER", "CASHIER", "TECHNICIAN", "ACCOUNTANT"];

export const shopSettingsSchema = z.object({
  name: required(2, 80, "Shop name"),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number"),
  city: required(2, 60, "City"),
  address: required(5, 200, "Address"),
  timezone: z.string().trim().refine(isValidTimezone, "Choose a valid timezone"),
});

const branchIds = z
  .array(z.string().refine(isSafeId, "Invalid branch"))
  .max(50, "Too many branches")
  .default([]);

/** A scoped member needs at least one branch; an all-branches member needs none. */
const withBranchRule = (schema) =>
  schema.superRefine((value, ctx) => {
    if (!value.allBranches && value.branchIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["branchIds"], message: "Pick at least one branch, or allow all branches" });
    }
  });

export const memberUpdateSchema = withBranchRule(
  z.object({
    role: z.enum(ASSIGNABLE_ROLES),
    status: z.enum(["ACTIVE", "DISABLED"]),
    allBranches: z.boolean(),
    branchIds,
  })
);

export const invitationSchema = withBranchRule(
  z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email").max(120, "Email is too long"),
    role: z.enum(ASSIGNABLE_ROLES),
    allBranches: z.boolean(),
    branchIds,
  })
);

export const acceptInvitationSchema = z.object({
  invitationId: z.string().refine(isSafeId, "Invalid invitation"),
});
