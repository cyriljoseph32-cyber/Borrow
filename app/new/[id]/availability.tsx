"use client";

import { useActionState, useTransition } from "react";
import { addAvailability, removeAvailability } from "@/app/actions/listings";
import { Alert, Button, Field, Input } from "@/components/ui";
import { dateTime, toLocalInput } from "@/lib/format";

type Row = { id: string; kind: string; starts_at: string; ends_at: string };

export function AvailabilityManager({
  listingId,
  kind,
  rows,
}: {
  listingId: string;
  kind: "blocked" | "open";
  rows: Row[];
}) {
  const [state, action, pending] = useActionState(addAvailability, null);
  const [, startTransition] = useTransition();

  const now = new Date();
  const later = new Date(now.getTime() + 3 * 3_600_000);

  return (
    <div>
      {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}

      {rows.length > 0 && (
        <ul className="mb-4 divide-y divide-navy-100 rounded-lg border border-navy-100">
          {rows
            .slice()
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
            .map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="text-navy-700">
                  {dateTime(r.starts_at)} → {dateTime(r.ends_at)}
                </span>
                <button
                  type="button"
                  onClick={() => startTransition(() => void removeAvailability(r.id, listingId))}
                  className="ml-auto text-xs text-brick hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
        </ul>
      )}

      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="listing_id" value={listingId} />
        <input type="hidden" name="kind" value={kind} />

        <Field label="From">
          <Input type="datetime-local" name="starts_at" defaultValue={toLocalInput(now)} required />
        </Field>
        <Field label="To">
          <Input type="datetime-local" name="ends_at" defaultValue={toLocalInput(later)} required />
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Adding…" : kind === "blocked" ? "Block these dates" : "Open this slot"}
          </Button>
        </div>
      </form>
    </div>
  );
}
