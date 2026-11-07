"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { normalizeSlug } from "@/lib/validations/slug";
import { applicationSchema } from "@/lib/validations/onboarding";

export default function ApplicationForm({ defaultOwnerName = "" }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      shopName: "",
      slug: "",
      ownerName: defaultOwnerName,
      phone: "",
      city: "",
      address: "",
      expectedBranches: "1",
    },
  });

  // Suggest the shop address from the shop name until the user edits it themselves.
  const shopName = useWatch({ control: form.control, name: "shopName" });
  const slugTouched = form.formState.dirtyFields.slug;
  useEffect(() => {
    if (!slugTouched) form.setValue("slug", normalizeSlug(shopName));
  }, [shopName, slugTouched, form]);

  async function onSubmit(values) {
    setFormError(null);
    try {
      const response = await fetch("/api/onboarding/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setFormError(body?.error?.message ?? "Could not submit your application. Please try again.");
        return;
      }
      router.refresh(); // the server page now shows the "under review" state
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormField control={form.control} name="shopName" label="Shop name" idPrefix="app" />
        <FormField
          control={form.control}
          name="slug"
          label="Shop address"
          description="Lowercase letters, numbers and hyphens. Used for your shop's web address later."
          idPrefix="app"
        />
        <FormField control={form.control} name="ownerName" label="Owner name" autoComplete="name" idPrefix="app" />
        <FormField
          control={form.control}
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          idPrefix="app"
        />
        <FormField control={form.control} name="city" label="City" idPrefix="app" />
        <FormField control={form.control} name="address" label="Shop address (street)" multiline idPrefix="app" />
        <FormField
          control={form.control}
          name="expectedBranches"
          label="How many branches do you expect to run?"
          type="number"
          inputMode="numeric"
          idPrefix="app"
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Submitting..." : "Submit application"}
        </Button>
      </FieldGroup>
    </form>
  );
}
