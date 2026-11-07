"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPkr } from "@/lib/formatters/money";

/** Scan or type an IMEI, barcode or SKU. The server searches only this shop (and only the caller's branches for IMEI). */
export default function LookupBox({ tenantId }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState({ status: "idle" });

  async function onSubmit(event) {
    event.preventDefault();
    if (code.trim().length < 3) return;
    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/tenants/${tenantId}/lookup?code=${encodeURIComponent(code.trim())}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setState({ status: "error", message: body?.error?.message ?? "Lookup failed. Try again." });
        return;
      }
      setState(body.found ? { status: "found", result: body.result } : { status: "none" });
    } catch {
      setState({ status: "error", message: "Network error. Check your connection and try again." });
    }
  }

  const { result } = state;
  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex max-w-xl gap-2" role="search" aria-label="Lookup">
        <label htmlFor="lookup-code" className="sr-only">
          IMEI, barcode or SKU
        </label>
        <Input id="lookup-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan or type IMEI, barcode or SKU" inputMode="text" autoComplete="off" />
        <Button type="submit" disabled={state.status === "loading"}>
          <Search className="size-4" aria-hidden="true" />
          <span className="ms-2">{state.status === "loading" ? "Searching..." : "Lookup"}</span>
        </Button>
      </form>

      <div aria-live="polite" className="text-sm">
        {state.status === "none" ? <p className="text-muted-foreground">Nothing in your shop matches that code.</p> : null}
        {state.status === "error" ? <p role="alert" className="text-destructive">{state.message}</p> : null}
        {state.status === "found" && result.kind === "IMEI" ? (
          <p>
            Device: <Link className="font-medium underline underline-offset-4" href={`/dashboard/imei/${result.record.id}`}>{result.record.productName} ({result.record.variantLabel})</Link>{" "}
            · {result.record.status.toLowerCase().replace("_", " ")} · {result.record.branchName}
          </p>
        ) : null}
        {state.status === "found" && result.kind === "VARIANT" ? (
          <p>
            Variant of <Link className="font-medium underline underline-offset-4" href={`/dashboard/products/${result.product.id}`}>{result.product.name}</Link>:{" "}
            {[result.variant.ram, result.variant.storage, result.variant.color].filter(Boolean).join(" · ") || "Standard"} · {formatPkr(result.variant.sellingPrice)}
          </p>
        ) : null}
        {state.status === "found" && result.kind === "PRODUCT" ? (
          <p>
            Product: <Link className="font-medium underline underline-offset-4" href={`/dashboard/products/${result.product.id}`}>{result.product.name}</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
