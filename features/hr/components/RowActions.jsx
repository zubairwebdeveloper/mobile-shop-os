"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { callApi } from "@/features/inventory/api";

/** A few buttons that each send one request (leave decisions, commission finalise / paid). `actions` = [{ label, method, url, body, variant }]. */
export default function RowActions({ actions }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run(a) {
    setBusy(true);
    setError(null);
    try {
      await callApi(a.url, a.method, a.body);
      toast.success(`${a.label}: done.`);
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex flex-wrap gap-2">
        {actions.map((a) => <Button key={a.label} type="button" size="sm" variant={a.variant ?? "outline"} disabled={busy} onClick={() => run(a)}>{a.label}</Button>)}
      </span>
      {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
