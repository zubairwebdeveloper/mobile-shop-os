import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^[+\d][\d\s-]{6,}$/.test(v), "Enter a valid phone number"),
  topic: z.string().min(1, "Please choose a topic"),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000, "Maximum 1000 characters"),
  consent: z.boolean().refine((v) => v === true, "Please accept to continue"),
});

export const couponSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code").max(20, "Coupon code is too long"),
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^(\+92|0)?3\d{2}[\s-]?\d{7}$/, "Enter a valid Pakistani mobile number, e.g. 0300 1234567"),
  address: z.string().trim().min(8, "Please enter your full street address"),
  city: z.string().trim().min(2, "City is required"),
  province: z.string().min(1, "Please choose a province"),
  postalCode: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4,6}$/.test(v), "Postal code must be 4 to 6 digits"),
  notes: z.string().max(300, "Maximum 300 characters").optional(),
  paymentMethod: z.literal("cod", { errorMap: () => ({ message: "Choose a payment method" }) }),
  acceptTerms: z.boolean().refine((v) => v === true, "Please confirm to place your order"),
});
