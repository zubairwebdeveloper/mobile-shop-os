"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { loginSchema } from "@/lib/validations/auth";
import { signInWithPassword } from "../client";
import { authErrorMessage } from "../errors";

export default function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      const user = await signInWithPassword(values.email, values.password);
      router.replace(user.emailVerified ? "/dashboard" : "/verify-email");
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="email" label="Email" type="email" autoComplete="email" idPrefix="login" />
        <FormField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          idPrefix="login"
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}
