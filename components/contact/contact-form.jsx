"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema } from "@/lib/validations/forms";

const TOPICS = ["Product enquiry", "Order support", "Warranty & repair", "Trade-in", "Other"];

export function ContactForm() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", topic: "", message: "", consent: false },
  });

  async function onSubmit() {
    try {
      // Real delivery (Firestore / email) Phase 04+ mein. Abhi sirf validated demo.
      await new Promise((r) => setTimeout(r, 700));
      toast.success("Form validated. Message delivery will be connected in the backend phase.");
      reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardHeader>
          <CardTitle className="text-xl">Send us a message</CardTitle>
          <CardDescription>We usually reply within one business day.</CardDescription>
        </CardHeader>
        <CardContent className="mt-5">
          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="contact-name">Full name</FieldLabel>
                    <Input {...field} id="contact-name" autoComplete="name" aria-invalid={fieldState.invalid} disabled={isSubmitting} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="contact-email">Email</FieldLabel>
                    <Input {...field} id="contact-email" type="email" autoComplete="email" aria-invalid={fieldState.invalid} disabled={isSubmitting} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                name="phone"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="contact-phone">Phone (optional)</FieldLabel>
                    <Input {...field} id="contact-phone" type="tel" autoComplete="tel" placeholder="+92 300 1234567" aria-invalid={fieldState.invalid} disabled={isSubmitting} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="topic"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="contact-topic">Topic</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                      <SelectTrigger id="contact-topic" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Choose a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOPICS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="message"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="contact-message">Message</FieldLabel>
                  <Textarea {...field} id="contact-message" rows={5} aria-invalid={fieldState.invalid} disabled={isSubmitting} />
                  <FieldDescription>Include the product name or order number if relevant.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="consent"
              control={control}
              render={({ field, fieldState }) => (
                <Field orientation="horizontal" data-invalid={fieldState.invalid} className="items-start">
                  <Checkbox
                    id="contact-consent"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    aria-invalid={fieldState.invalid}
                    disabled={isSubmitting}
                  />
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="contact-consent" className="font-normal">
                      I agree to be contacted about my enquiry.
                    </FieldLabel>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </div>
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
            {isSubmitting ? "Sending..." : "Send message"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
