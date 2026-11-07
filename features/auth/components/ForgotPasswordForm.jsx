"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordReset } from "../client";
import { authErrorMessage } from "../errors";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await sendPasswordReset(values.email);
      setSent(true);
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  if (sent) {
    return (
      <p role="status" className="text-sm">
        If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.
      </p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="email" label="Email" type="email" autoComplete="email" idPrefix="forgot" />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </FieldGroup>
    </form>
  );
}
