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
import { productSchema } from "@/lib/validations/catalog";
import { callApi } from "../api";

const STATUS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived (hidden from new sales)" },
];

export default function ProductForm({ tenantId, product, brands, categories, canManage }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const editing = Boolean(product);

  const brandOptions = brands.filter((b) => b.active || b.id === product?.brandId).map((b) => ({ value: b.id, label: b.name }));
  const categoryOptions = categories.filter((c) => c.active || c.id === product?.categoryId).map((c) => ({ value: c.id, label: c.name }));

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      brandId: product?.brandId ?? brandOptions[0]?.value ?? "",
      categoryId: product?.categoryId ?? categoryOptions[0]?.value ?? "",
      description: product?.description ?? "",
      specs: product?.specs ?? "",
      barcode: product?.barcode ?? "",
      status: product?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      if (editing) {
        await callApi(`/api/tenants/${tenantId}/products/${product.id}`, "PATCH", values);
        toast.success("Product saved.");
        router.refresh();
      } else {
        const { id } = await callApi(`/api/tenants/${tenantId}/products`, "POST", values);
        toast.success("Product created. Add its variants next.");
        router.push(`/dashboard/products/${id}`);
      }
    } catch (error) {
      setFormError(error.message);
    }
  }

  if (brandOptions.length === 0 || categoryOptions.length === 0) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6 text-sm">
          Create at least one active brand and category first (Categories and brands page).
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-lg">{editing ? "Product details" : "New product"}</CardTitle>
        <CardDescription>Prices, storage, RAM and colours belong to variants, added after the product exists.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <FormField control={form.control} name="name" label="Product name" placeholder="e.g. Galaxy A55" disabled={!canManage} idPrefix="product" />
            <FormField control={form.control} name="brandId" label="Brand" options={brandOptions} disabled={!canManage} idPrefix="product" />
            <FormField control={form.control} name="categoryId" label="Category" options={categoryOptions} disabled={!canManage} idPrefix="product" />
            <FormField control={form.control} name="description" label="Description" multiline disabled={!canManage} idPrefix="product" />
            <FormField control={form.control} name="specs" label="Specifications" description="Free text, one per line." multiline disabled={!canManage} idPrefix="product" />
            <FormField control={form.control} name="barcode" label="Barcode (optional)" description="Used for scanning. Must be unique in your shop." disabled={!canManage} idPrefix="product" />
            <FormField control={form.control} name="status" label="Status" options={STATUS} disabled={!canManage} idPrefix="product" />
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            {canManage ? (
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : editing ? "Save product" : "Create product"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Only the owner or a manager can edit products.</p>
            )}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
