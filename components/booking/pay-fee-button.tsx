"use client";

import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import { thb } from "@/lib/format";

export function PayFeeButton({ bookingId, amount }: { bookingId: string; amount: number }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Payment could not start");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment could not start");
      setBusy(false);
    }
  }

  return (
    <>
      {error && <Alert tone="error">{error}</Alert>}
      <Button onClick={pay} disabled={busy}>
        {busy ? "Opening checkout…" : `Pay ${thb(amount)} and confirm`}
      </Button>
    </>
  );
}
