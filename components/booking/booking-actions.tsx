"use client";

import { useActionState, useState } from "react";
import {
  respondToBooking,
  cancelBooking,
  confirmPickup,
  confirmReturn,
  openDispute,
} from "@/app/actions/bookings";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { BookingStatus, PaymentStatus, ListingKind } from "@/types/database";

type B = {
  id: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  kind: ListingKind;
  starts_at: string;
};

export function BookingActions({ booking, isOwner }: { booking: B; isOwner: boolean }) {
  const [respond, respondAction, respondPending] = useActionState(respondToBooking, null);
  const [cancel, cancelAction, cancelPending] = useActionState(cancelBooking, null);
  const [pickup, pickupAction, pickupPending] = useActionState(confirmPickup, null);
  const [ret, returnAction, returnPending] = useActionState(confirmReturn, null);
  const [dispute, disputeAction, disputePending] = useActionState(openDispute, null);

  const [showDispute, setShowDispute] = useState(false);

  const err = [respond, cancel, pickup, ret, dispute].find(
    (s) => s && "error" in s && s.error,
  ) as { error: string } | undefined;

  const hoursToStart = (new Date(booking.starts_at).getTime() - Date.now()) / 3_600_000;
  const canCancel = ["requested", "accepted"].includes(booking.status);
  const canDispute = ["in_progress", "completed"].includes(booking.status);

  const nothingToDo =
    !canCancel &&
    !canDispute &&
    !(isOwner && booking.status === "requested") &&
    !(isOwner && booking.status === "accepted" && booking.payment_status === "fee_paid") &&
    !(isOwner && booking.status === "in_progress");

  if (nothingToDo) return null;

  return (
    <Card>
      <h2 className="mb-4 font-medium text-navy-900">Actions</h2>
      {err?.error && <Alert tone="error">{err.error}</Alert>}

      {isOwner && booking.status === "requested" && (
        <div className="mb-4 space-y-3">
          <form action={respondAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="booking_id" value={booking.id} />
            <input type="hidden" name="accept" value="true" />
            <Button type="submit" disabled={respondPending}>
              {respondPending ? "…" : "Accept the request"}
            </Button>
          </form>
          <form action={respondAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="booking_id" value={booking.id} />
            <input type="hidden" name="accept" value="false" />
            <div className="flex-1">
              <Input name="reason" placeholder="Reason (optional)" />
            </div>
            <Button type="submit" variant="secondary" disabled={respondPending}>
              Decline
            </Button>
          </form>
        </div>
      )}

      {isOwner && booking.status === "accepted" && booking.payment_status === "fee_paid" && (
        <form action={pickupAction} className="mb-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="booking_id" value={booking.id} />
          <div className="flex-1">
            <Field label="Handover code" hint="Ask the renter for the 6-character code.">
              <Input name="code" maxLength={6} placeholder="A1B2C3" className="font-mono uppercase" required />
            </Field>
          </div>
          <Button type="submit" disabled={pickupPending} className="mb-4">
            {pickupPending ? "…" : "Confirm handover"}
          </Button>
        </form>
      )}

      {isOwner && booking.status === "in_progress" && (
        <form action={returnAction} className="mb-4">
          <input type="hidden" name="booking_id" value={booking.id} />
          <Button type="submit" disabled={returnPending}>
            {returnPending
              ? "…"
              : booking.kind === "item"
                ? "Confirm return & close"
                : "Mark session as done"}
          </Button>
        </form>
      )}

      {canCancel && (
        <form action={cancelAction} className="mb-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="booking_id" value={booking.id} />
          <div className="flex-1">
            <Input name="reason" placeholder="Why are you cancelling? (optional)" />
          </div>
          <Button type="submit" variant="danger" disabled={cancelPending}>
            Cancel booking
          </Button>
          {booking.status === "accepted" && (
            <p className="w-full text-xs text-navy-400">
              {hoursToStart >= 48
                ? "More than 48 h before the start: the Borrow fee is refunded."
                : "Less than 48 h before the start: the Borrow fee is not refunded."}
            </p>
          )}
        </form>
      )}

      {canDispute && (
        <div>
          {!showDispute ? (
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              className="text-sm text-brick hover:underline"
            >
              Something went wrong — open a dispute
            </button>
          ) : (
            <form action={disputeAction}>
              <input type="hidden" name="booking_id" value={booking.id} />
              <Field label="What happened?">
                <Input name="reason" placeholder="Damaged, not returned, no-show…" required />
              </Field>
              <Field label="Describe it" hint="Borrow acts as a neutral party and decides on evidence.">
                <Textarea name="description" rows={4} required />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" variant="danger" disabled={disputePending}>
                  {disputePending ? "…" : "Open dispute"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowDispute(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
