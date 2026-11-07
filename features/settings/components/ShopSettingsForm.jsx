"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { shopSettingsSchema } from "@/lib/validations/team";

export default function ShopSettingsForm({ tenantId, initial, canEdit, slug, currency }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const form = useForm({ resolver: zodResolver(shopSettingsSchema), defaultValues: initial });

  async function onSubmit(values) {
    setFormError(null);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setFormError(body?.error?.message ?? "The request failed. Please try again.");
        return;
      }
      toast.success("Settings saved.");
      router.refresh();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Shop profile</CardTitle>
        <CardDescription>
          {canEdit ? "Only the owner can change these details." : "Only the owner can change these details. You can view them here."}
          {" "}Shop address: {slug} · Currency: {currency}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="name" label="Shop name" disabled={!canEdit} idPrefix="shop" />
            <FormField control={form.control} name="phone" label="Phone" type="tel" inputMode="tel" disabled={!canEdit} idPrefix="shop" />
            <FormField control={form.control} name="city" label="City" disabled={!canEdit} idPrefix="shop" />
            <FormField control={form.control} name="address" label="Address" multiline disabled={!canEdit} idPrefix="shop" />
            <FormField
              control={form.control}
              name="timezone"
              label="Timezone"
              description="IANA name, for example Asia/Karachi."
              disabled={!canEdit}
              idPrefix="shop"
            />
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            {canEdit ? (
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save settings"}
              </Button>
            ) : null}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
