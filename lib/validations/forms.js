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
