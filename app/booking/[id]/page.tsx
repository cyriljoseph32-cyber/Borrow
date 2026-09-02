import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentProfile, photoUrl, avatarUrl } from "@/lib/queries";
import { thb, dateTime, dateRange, fromNow } from "@/lib/format";
import { Avatar, Badge, Card } from "@/components/ui";
import { BookingActions } from "@/components/booking/booking-actions";
import { HandoverPanel } from "@/components/booking/handover-panel";
import { ReviewPanel } from "@/components/booking/review-panel";
import { PayFeeButton } from "@/components/booking/pay-fee-button";
import type { BookingStatus } from "@/types/database";

export const metadata = { title: "Booking" };

const STATUS_TONE: Record<BookingStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  requested: "warning",
  accepted: "info",
  declined: "danger",
  expired: "neutral",
  cancelled_by_renter: "danger",
  cancelled_by_owner: "danger",
  in_progress: "info",
  completed: "success",
  disputed: "danger",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Waiting for the owner",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  cancelled_by_renter: "Cancelled by the renter",
  cancelled_by_owner: "Cancelled by the owner",
  in_progress: "In progress",
  completed: "Completed",
  disputed: "Disputed",
};

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { id } = await params;
  const { paid } = await searchParams;

  const profile = await currentProfile();
  if (!profile) redirect(`/login?next=/booking/${id}`);

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `*,
       listings(id,title,kind,area,listing_photos(storage_path,sort_order)),
       renter:profiles!bookings_renter_id_fkey(id,full_name,avatar_url,phone),
       owner:profiles!bookings_owner_id_fkey(id,full_name,avatar_url,phone)`,
    )
    .eq("id", id)
    .single();

  if (!booking) notFound();

  const isOwner = booking.owner_id === profile.id;
  const isRenter = booking.renter_id === profile.id;
  if (!isOwner && !isRenter) notFound();

  const listing = booking.listings as unknown as {
    id: string;
    title: string;
    kind: string;
    area: string;
    listing_photos: { storage_path: string; sort_order: number }[];
  };
  const other = (isOwner ? booking.renter : booking.owner) as unknown as {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  };

  const [{ data: events }, { data: checks }, { data: myReview }, { data: thread }] =
    await Promise.all([
      supabase
        .from("booking_events")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("handover_checks").select("*").eq("booking_id", id),
      supabase.from("reviews").select("*").eq("booking_id", id).eq("author_id", profile.id).maybeSingle(),
      supabase.from("threads").select("id").eq("listing_id", listing.id).eq("renter_id", booking.renter_id).maybeSingle(),
    ]);

  const status = booking.status as BookingStatus;
  const cover = photoUrl(
    listing.listing_photos?.sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path,
  );

  // Le code de remise n'est montré qu'à l'emprunteur : c'est lui qui le donne au prêteur.
  const showCode = isRenter && booking.handover_code && status === "accepted";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {paid === "1" && booking.payment_status === "fee_paid" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Fee paid — your booking is confirmed. Show the handover code below when you meet.
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-start gap-4">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-20 w-20 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            <h1 className="mt-2 text-xl font-semibold text-navy-900">
              <Link href={`/l/${listing.id}`} className="hover:underline">
                {listing.title}
              </Link>
            </h1>
            <p className="mt-1 text-sm text-navy-400">
              {booking.kind === "item"
                ? dateRange(booking.starts_at, booking.ends_at)
                : `${dateTime(booking.starts_at)} · ${booking.quantity} participant(s)`}{" "}
              · {listing.area}
            </p>
            <p className="mt-1 text-xs text-navy-400">
              You are the {isOwner ? "owner" : "renter"} · requested {fromNow(booking.requested_at)}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium text-navy-900">Money</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy-400">{booking.kind === "item" ? "Rental" : "Session"}</dt>
              <dd className="text-navy-900">{thb(booking.price_amount)}</dd>
            </div>
            {booking.deposit_amount > 0 && (
              <div className="flex justify-between">
                <dt className="text-navy-400">Deposit</dt>
                <dd className="text-navy-900">{thb(booking.deposit_amount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-navy-100 pt-1.5">
              <dt className="text-navy-400">Borrow fee</dt>
              <dd className="font-medium text-navy-900">{thb(booking.service_fee_amount)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-navy-400">
            Rental and deposit are settled directly between the two of you at handover. Borrow only
            collects its service fee.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium text-navy-900">
            {isOwner ? "Renter" : "Owner"}
          </h2>
          <div className="flex items-center gap-3">
            <Avatar src={avatarUrl(other.avatar_url)} name={other.full_name} size={40} />
            <div>
              <Link href={`/u/${other.id}`} className="text-sm font-medium hover:underline">
                {other.full_name || "Borrow member"}
              </Link>
              {["accepted", "in_progress"].includes(status) && other.phone && (
                <p className="text-sm text-navy-400">{other.phone}</p>
              )}
            </div>
          </div>
          {thread && (
            <Link
              href={`/messages/${thread.id}`}
              className="mt-3 inline-block text-sm text-navy-700 underline hover:text-navy-900"
            >
              Open the conversation →
            </Link>
          )}
        </Card>
      </div>

      {booking.renter_message && (
        <Card>
          <h2 className="mb-1 text-sm font-medium text-navy-900">Message from the renter</h2>
          <p className="text-sm text-navy-700">{booking.renter_message}</p>
        </Card>
      )}

      {showCode && (
        <Card className="border-terracotta bg-terracotta text-sand">
          <p className="text-sm text-sand/70">Handover code — give it to the owner when you meet</p>
          <p className="mt-1 font-mono text-3xl tracking-[0.3em]">{booking.handover_code}</p>
        </Card>
      )}

      {isRenter && status === "accepted" && booking.payment_status === "fee_pending" && (
        <Card>
          <h2 className="mb-1 font-medium text-navy-900">Confirm your booking</h2>
          <p className="mb-4 text-sm text-navy-400">
            Pay the Borrow service fee of {thb(booking.service_fee_amount)} to lock the booking and
            unlock your handover code.
          </p>
          <PayFeeButton bookingId={booking.id} amount={booking.service_fee_amount} />
        </Card>
      )}

      <BookingActions
        booking={{
          id: booking.id,
          status,
          payment_status: booking.payment_status,
          kind: booking.kind,
          starts_at: booking.starts_at,
        }}
        isOwner={isOwner}
      />

      {booking.kind === "item" && ["accepted", "in_progress", "completed"].includes(status) && (
        <HandoverPanel
          bookingId={booking.id}
          userId={profile.id}
          status={status}
          checks={checks ?? []}
        />
      )}

      {status === "completed" && (
        <ReviewPanel bookingId={booking.id} existing={myReview ?? null} />
      )}

      {!!events?.length && (
        <Card>
          <h2 className="mb-3 font-medium text-navy-900">History</h2>
          <ol className="space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="w-40 shrink-0 text-navy-400">{dateTime(e.created_at)}</span>
                <span className="text-navy-700">
                  {STATUS_LABEL[e.to_status as BookingStatus]}
                  {e.note ? ` — ${e.note}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
