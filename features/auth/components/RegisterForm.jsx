"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { registerSchema } from "@/lib/validations/auth";
import { registerWithPassword } from "../client";
import { authErrorMessage } from "../errors";

export default function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await registerWithPassword({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      });
      router.replace("/verify-email");
      router.refresh();
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="displayName" label="Full name" autoComplete="name" idPrefix="reg" />
        <FormField control={form.control} name="email" label="Email" type="email" autoComplete="email" idPrefix="reg" />
        <FormField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          description="At least 8 characters, with a letter and a number."
          idPrefix="reg"
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          idPrefix="reg"
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}
