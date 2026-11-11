"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/animations/reveal";
import { newsletterSchema } from "@/lib/validations/forms";

export function Newsletter() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(newsletterSchema), defaultValues: { email: "" } });

  async function onSubmit() {
    // Backend subscription Phase 04 mein connect hogi. Abhi sirf validation demo.
    await new Promise((r) => setTimeout(r, 600));
    toast.success("Email looks good! Newsletter delivery will be connected with the backend phase.");
    reset();
  }

  return (
    <section className="container-page mt-24" aria-labelledby="newsletter-heading">
      <Reveal>
        <Card className="mx-auto max-w-3xl">
          <CardHeader className="items-center text-center">
            <span className="mb-2 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="size-6" />
            </span>
            <CardTitle id="newsletter-heading" className="text-2xl">
              Get launch alerts and exclusive deals
            </CardTitle>
            <CardDescription>One short email a week. Unsubscribe any time.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-md">
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="newsletter-email">Email address</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        {...field}
                        id="newsletter-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        aria-invalid={fieldState.invalid}
                        disabled={isSubmitting}
                      />
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="animate-spin" />} Subscribe
                      </Button>
                    </div>
                    <FieldDescription>We never share your email.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </form>
          </CardContent>
        </Card>
      </Reveal>
    </section>
  );
}
