/**
 * E-mails transactionnels via Resend.
 *
 * Nécessite RESEND_API_KEY. RESEND_FROM (optionnel) — sinon on utilise
 * l'adresse de test Resend (onboarding@resend.dev), qui fonctionne sans
 * domaine vérifié mais n'est pas destinée à un vrai lancement : dès qu'un
 * domaine est vérifié dans Resend, mettre RESEND_FROM="Borrow <hello@tondomaine>".
 *
 * Fait exprès de ne jamais lever en cas d'échec d'envoi : un e-mail raté ne
 * doit jamais faire échouer une transition de réservation (déjà actée en
 * base par le RPC au moment où on appelle ceci).
 */

import { thb, dateRange } from "@/lib/format";
import type { Booking, Listing } from "@/types/database";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || "Borrow <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://borrow-ten.vercel.app";

async function send(to: string | null | undefined, subject: string, html: string) {
  if (!RESEND_API_KEY) return; // pas configuré : no-op silencieux
  if (!to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject,
        html: wrap(html),
      }),
    });
  } catch {
    // best-effort — on ne bloque jamais le flux principal pour un email raté
  }
}

function wrap(inner: string) {
  return `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0f2540;max-width:480px;margin:0 auto;padding:24px 0">
    <p style="font-weight:700;font-size:18px;margin:0 0 20px">Borrow</p>
    ${inner}
    <p style="margin-top:32px;font-size:12px;color:#8a97a8">Koh Samui pilot · <a href="${SITE_URL}" style="color:#8a97a8">${SITE_URL}</a></p>
  </div>`;
}

function button(href: string, label: string) {
  return `<p><a href="${href}" style="display:inline-block;background:#0f2540;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">${label}</a></p>`;
}

type BookingEmailCtx = {
  booking: Booking;
  listing: Listing;
  renterEmail: string | null;
  renterName: string;
  ownerEmail: string | null;
  ownerName: string;
};

const bookingUrl = (id: string) => `${SITE_URL}/booking/${id}`;

export async function emailBookingRequested(ctx: BookingEmailCtx) {
  const { booking, listing, ownerEmail, renterName } = ctx;
  await send(
    ownerEmail,
    `New booking request — ${listing.title}`,
    `<p>${renterName} wants to book <strong>${listing.title}</strong> (${dateRange(
      booking.starts_at,
      booking.ends_at
    )}).</p>
     <p>Amount: ${thb(booking.price_amount)}${booking.deposit_amount ? ` + ${thb(booking.deposit_amount)} deposit` : ""}.</p>
     ${button(bookingUrl(booking.id), "Respond to this request")}`
  );
}

export async function emailBookingAccepted(ctx: BookingEmailCtx) {
  const { booking, listing, renterEmail } = ctx;
  await send(
    renterEmail,
    `Booking accepted — ${listing.title}`,
    `<p>Your request for <strong>${listing.title}</strong> (${dateRange(
      booking.starts_at,
      booking.ends_at
    )}) was accepted.</p>
     ${button(bookingUrl(booking.id), "View booking")}`
  );
}

export async function emailBookingDeclined(ctx: BookingEmailCtx) {
  const { booking, listing, renterEmail } = ctx;
  await send(
    renterEmail,
    `Booking declined — ${listing.title}`,
    `<p>Your request for <strong>${listing.title}</strong> was declined${
      booking.decline_reason ? `: "${booking.decline_reason}"` : "."
    }</p>
     ${button(`${SITE_URL}/browse`, "Find something else")}`
  );
}

export async function emailBookingCancelled(ctx: BookingEmailCtx, cancelledBy: "renter" | "owner") {
  const { booking, listing, renterEmail, ownerEmail } = ctx;
  const to = cancelledBy === "renter" ? ownerEmail : renterEmail;
  await send(
    to,
    `Booking cancelled — ${listing.title}`,
    `<p>The booking for <strong>${listing.title}</strong> (${dateRange(
      booking.starts_at,
      booking.ends_at
    )}) was cancelled${booking.cancellation_reason ? `: "${booking.cancellation_reason}"` : "."}</p>
     ${button(bookingUrl(booking.id), "View booking")}`
  );
}

export async function emailHandoverConfirmed(ctx: BookingEmailCtx, phase: "pickup" | "return") {
  const { booking, listing, renterEmail, ownerEmail } = ctx;
  const subject =
    phase === "pickup" ? `Handover confirmed — ${listing.title}` : `Return confirmed — ${listing.title}`;
  const body =
    phase === "pickup"
      ? `<p>The handover for <strong>${listing.title}</strong> is confirmed. Enjoy!</p>`
      : `<p>The return for <strong>${listing.title}</strong> is confirmed. Thanks for using Borrow — a review from both sides makes the next booking easier.</p>`;
  await Promise.all([send(renterEmail, subject, body), send(ownerEmail, subject, body)]);
}

/** Recharge tout le contexte nécessaire pour notifier une réservation par email. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadBookingEmailCtx(
  supabase: any,
  bookingId: string
): Promise<BookingEmailCtx | null> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (!booking) return null;

  const [{ data: listing }, { data: renter }, { data: owner }] = await Promise.all([
    supabase.from("listings").select("*").eq("id", booking.listing_id).single(),
    supabase.from("profiles").select("email, full_name").eq("id", booking.renter_id).single(),
    supabase.from("profiles").select("email, full_name").eq("id", booking.owner_id).single(),
  ]);
  if (!listing) return null;

  return {
    booking,
    listing,
    renterEmail: renter?.email ?? null,
    renterName: renter?.full_name ?? "A renter",
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.full_name ?? "The owner",
  };
}

export async function emailReviewPublished(ctx: BookingEmailCtx) {
  const { booking, listing, renterEmail, ownerEmail } = ctx;
  const subject = `New review — ${listing.title}`;
  const body = `<p>Both reviews for the booking of <strong>${listing.title}</strong> are in and now public.</p>
    ${button(bookingUrl(booking.id), "See the review")}`;
  await Promise.all([send(renterEmail, subject, body), send(ownerEmail, subject, body)]);
}
