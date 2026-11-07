import { z } from "zod";
import { isValidDateString } from "../platform/subscription";

const wholeNumber = (label, min, max) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

const planFields = {
  name: z.string().trim().min(2, "Name is required").max(40, "Name is too long"),
  description: z.string().trim().max(200, "Description is too long").default(""),
  priceMonthlyPkr: z
    .string()
    .trim()
    .default("")
    .refine((value) => value === "" || /^\d{1,9}$/.test(value), "Whole rupees only, or leave empty for 'contact us'"),
  maxBranches: wholeNumber("Branches", 1, 1000),
  maxEmployees: wholeNumber("Employees", 1, 100000),
  aiRequestsPerMonth: wholeNumber("AI requests", 0, 1000000),
  features: z.string().max(1600, "Too many features").default(""),
  visibility: z.enum(["PUBLIC", "HIDDEN"]),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  sortOrder: wholeNumber("Order", 0, 1000).default(0),
};

export const planIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9-]{1,29}$/, "2-30 lowercase letters, numbers or hyphens; must start with a letter");

export const planCreateSchema = z.object({ id: planIdSchema, ...planFields });
export const planUpdateSchema = z.object({ ...planFields });

export const subscriptionSchema = z.object({
  planId: z.string().trim().min(1, "Choose a plan").max(40),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"]),
  renewsAt: z
    .string()
    .trim()
    .default("")
    .refine((value) => value === "" || isValidDateString(value), "Use a real date (YYYY-MM-DD)"),
  note: z.string().trim().max(300, "Note is too long").default(""),
});

export const tenantStatusSchema = z
  .object({
    action: z.enum(["SUSPEND", "REACTIVATE"]),
    reason: z.string().trim().max(300, "Reason is too long").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "SUSPEND" && (value.reason ?? "").length < 3) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Give a reason (at least 3 characters)" });
    }
  });

// Form-only schema for the suspend dialog (the action itself is fixed by the button)
export const suspendFormSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason (at least 3 characters)").max(300, "Reason is too long"),
});
