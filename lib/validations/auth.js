import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
    email,
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(200, "Password is too long")
      .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Include at least one letter and one number"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({ email });
