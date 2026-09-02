"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/bookings";
import { Alert, Button, Card, Field, Textarea } from "@/components/ui";
import type { Review } from "@/types/database";

export function ReviewPanel({
  bookingId,
  existing,
}: {
  bookingId: string;
  existing: Review | null;
}) {
  const [state, action, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(5);

  if (existing || (state && "ok" in state && state.ok)) {
    return (
      <Card>
        <h2 className="mb-1 font-medium text-navy-900">Your review</h2>
        <p className="text-sm text-navy-400">
          Recorded. Reviews are published once both sides have written one, or after 14 days.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-1 font-medium text-navy-900">Leave a review</h2>
      <p className="mb-4 text-sm text-navy-400">
        Double-blind: the other person sees it only once they have written theirs.
      </p>

      {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}

      <form action={action}>
        <input type="hidden" name="booking_id" value={bookingId} />
        <input type="hidden" name="rating" value={rating} />

        <div className="mb-4 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`text-2xl leading-none transition ${
                n <= rating ? "text-navy-900" : "text-navy-200"
              }`}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>

        <Field label="Comment" hint="Optional.">
          <Textarea name="comment" rows={3} maxLength={2000} />
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Submit review"}
        </Button>
      </form>
    </Card>
  );
}
