"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { matchesQuery } from "@/lib/catalog/pure";
import { imeiCreateSchema } from "@/lib/validations/catalog";
import { callApi } from "../api";

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "USED", label: "Used" },
  { value: "REFURBISHED", label: "Refurbished" },
];

export default function ImeiManager({ tenantId, records, variantOptions, branches, canRegister }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(imeiCreateSchema),
    defaultValues: {
      variantId: variantOptions[0]?.value ?? "",
      branchId: branches[0]?.id ?? "",
      imei1: "", imei2: "", serialNumber: "", condition: "NEW", purchasePrice: "", notes: "",
    },
  });

  const rows = useMemo(
    () => records.filter((r) => matchesQuery(query, r.imei1, r.imei2, r.serialNumber, r.productName)),
    [records, query]
  );

  async function onSubmit(values) {
    setFormError(null);
    try {
      await callApi(`/api/tenants/${tenantId}/imei`, "POST", values);
      toast.success("Device registered.");
      form.reset({ ...form.getValues(), imei1: "", imei2: "", serialNumber: "", notes: "" });
      router.refresh();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section aria-label="Devices" className="space-y-4">
        <div>
          <label htmlFor="imei-search" className="sr-only">
            Filter devices
          </label>
          <Input id="imei-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by IMEI, serial or product" className="max-w-sm" />
        </div>
        {rows.length === 0 ? (
          <EmptyState title={records.length === 0 ? "No devices registered" : "No devices match"} description={records.length === 0 ? "Register a device with its IMEI to start tracking it." : "Try a different filter."} />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">IMEI</th>
                  <th scope="col" className="px-4 py-3 font-medium">Product</th>
                  <th scope="col" className="px-4 py-3 font-medium">Branch</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link href={`/dashboard/imei/${r.id}`} className="underline-offset-4 hover:underline">
                        {r.imei1}
                      </Link>
                      {r.imei2 ? <span className="block text-muted-foreground">{r.imei2}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      {r.productName}
                      <span className="block text-xs text-muted-foreground">{r.variantLabel}</span>
                    </td>
                    <td className="px-4 py-3">{r.branchName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canRegister ? (
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Register a device</CardTitle>
            <CardDescription>
              The IMEI is checked for 15 digits and a valid check digit. This is a format check only, not PTA or manufacturer verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {variantOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No IMEI-tracked variants yet. Turn on IMEI tracking for a category, then add a product with a variant.
              </p>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <FieldGroup>
                  <FormField control={form.control} name="variantId" label="Product variant" options={variantOptions} idPrefix="imei" />
                  <FormField control={form.control} name="branchId" label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} idPrefix="imei" />
                  <FormField control={form.control} name="imei1" label="IMEI 1" inputMode="numeric" autoComplete="off" idPrefix="imei" />
                  <FormField control={form.control} name="imei2" label="IMEI 2 (dual SIM, optional)" inputMode="numeric" autoComplete="off" idPrefix="imei" />
                  <FormField control={form.control} name="serialNumber" label="Serial number (optional)" idPrefix="imei" />
                  <FormField control={form.control} name="condition" label="Condition" options={CONDITIONS} idPrefix="imei" />
                  <FormField control={form.control} name="purchasePrice" label="Purchase price (PKR, optional)" inputMode="numeric" idPrefix="imei" />
                  <FormField control={form.control} name="notes" label="Notes" multiline idPrefix="imei" />
                  {formError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {formError}
                    </p>
                  ) : null}
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Registering..." : "Register device"}
                  </Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

