"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { requestBooking } from "@/app/actions/bookings";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { estimate } from "@/lib/pricing";
import { thb, toLocalInput, dateTime } from "@/lib/format";
import type { ListingKind } from "@/types/database";

type L = {
  id: string;
  kind: ListingKind;
  price_amount: number;
  price_week_amount: number | null;
  price_month_amount: number | null;
  deposit_amount: number;
  capacity: number;
  duration_minutes: number | null;
  status: string;
};

export function BookingForm({
  listing,
  slots,
  canBook,
  isOwner,
  signedIn,
  phoneVerified,
}: {
  listing: L;
  slots: { starts_at: string; ends_at: string }[];
  canBook: boolean;
  isOwner: boolean;
  signedIn: boolean;
  phoneVerified: boolean;
}) {
  const [state, action, pending] = useActionState(requestBooking, null);

  const tomorrow = new Date(Date.now() + 86_400_000);
  const dayAfter = new Date(Date.now() + 2 * 86_400_000);

  const [start, setStart] = useState(toLocalInput(tomorrow));
  const [end, setEnd] = useState(toLocalInput(dayAfter));
  const [slotIndex, setSlotIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const isService = listing.kind === "service";
  const chosenSlot = slots[slotIndex];

  // Le calcul ci-dessous n'est qu'un aperçu : le montant qui fait foi est
  // recalculé par Postgres dans request_booking().
  const preview = useMemo(() => {
    const s = isService && chosenSlot ? new Date(chosenSlot.starts_at) : new Date(start);
    const e = isService
      ? new Date(
          (chosenSlot ? new Date(chosenSlot.starts_at).getTime() : Date.now()) +
            (listing.duration_minutes ?? 60) * 60_000,
        )
      : new Date(end);
    if (!(s instanceof Date) || isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    return estimate(listing, s, e, quantity);
  }, [isService, chosenSlot, start, end, quantity, listing]);

  const serviceStart = chosenSlot ? new Date(chosenSlot.starts_at) : null;
  const serviceEnd = serviceStart
    ? new Date(serviceStart.getTime() + (listing.duration_minutes ?? 60) * 60_000)
    : null;

  if (listing.status !== "published") {
    return (
      <Card>
        <p className="text-sm text-navy-400">This listing is not live yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-4 font-medium text-navy-900">
        {isService ? "Book a session" : "Request this item"}
      </h2>

      {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}

      {isOwner && <Alert tone="info">This is your own listing.</Alert>}
      {!signedIn && (
        <Alert tone="info">
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to book.
        </Alert>
      )}
      {signedIn && !phoneVerified && !isOwner && (
        <Alert tone="info">
          <Link href="/onboarding" className="underline">
            Confirm your phone number
          </Link>{" "}
          before booking.
        </Alert>
      )}

      <form action={action}>
        <input type="hidden" name="listing_id" value={listing.id} />

        {isService ? (
          <>
            {slots.length === 0 ? (
              <p className="mb-4 text-sm text-navy-400">
                No open slot right now. Message the provider to ask for one.
              </p>
            ) : (
              <>
                <Field label="Slot">
                  <Select
                    value={slotIndex}
                    onChange={(e) => setSlotIndex(Number(e.target.value))}
                  >
                    {slots.map((s, i) => (
                      <option key={i} value={i}>
                        {dateTime(s.starts_at)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <input
                  type="hidden"
                  name="starts_at"
                  value={serviceStart ? serviceStart.toISOString() : ""}
                />
                <input
                  type="hidden"
                  name="ends_at"
                  value={serviceEnd ? serviceEnd.toISOString() : ""}
                />
              </>
            )}

            <Field label="Participants">
              <Input
                name="quantity"
                type="number"
                min={1}
                max={listing.capacity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="From">
              <Input
                name="starts_at"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </Field>
            <Field label="To">
              <Input
                name="ends_at"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </Field>
            <input type="hidden" name="quantity" value={1} />
          </>
        )}

        <Field label="Message to the owner" hint="Optional, but it helps.">
          <Textarea name="message" rows={3} maxLength={1000} />
        </Field>

        {preview && (
          <div className="mb-4 space-y-1 rounded-lg bg-navy-50 p-3 text-sm">
            <div className="flex justify-between text-navy-700">
              <span>
                {isService
                  ? `${quantity} participant(s)`
                  : `${preview.days} day${preview.days > 1 ? "s" : ""}`}
              </span>
              <span>{thb(preview.price)}</span>
            </div>
            {preview.deposit > 0 && (
              <div className="flex justify-between text-navy-700">
                <span>Deposit (paid to the owner)</span>
                <span>{thb(preview.deposit)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-navy-200 pt-1 font-medium text-navy-900">
              <span>Borrow fee — due now</span>
              <span>{thb(preview.fee)}</span>
            </div>
            <p className="pt-1 text-xs text-navy-400">
              You pay {thb(preview.dueAtHandover)} directly to the owner at handover. Borrow only
              charges its service fee.
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={pending || !canBook || (isService && slots.length === 0)}
        >
          {pending ? "Sending…" : "Send request"}
        </Button>

        <p className="mt-3 text-xs text-navy-400">
          The owner has 48 hours to answer. Nothing is charged until they accept.
        </p>
      </form>
    </Card>
  );
}
