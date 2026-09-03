"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  bookingRequestSchema,
  reviewSchema,
  disputeSchema,
} from "@/lib/validation/booking";
import { humanError } from "@/lib/constants";
import {
  loadBookingEmailCtx,
  emailBookingRequested,
  emailBookingAccepted,
  emailBookingDeclined,
  emailBookingCancelled,
  emailHandoverConfirmed,
  emailReviewPublished,
} from "@/lib/email";

export async function requestBooking(_prev: unknown, formData: FormData) {
  const supabase = await createClient();

  const parsed = bookingRequestSchema.safeParse({
    listing_id: formData.get("listing_id"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    quantity: formData.get("quantity") || 1,
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the dates." };

  const { data, error } = await supabase.rpc("request_booking", {
    p_listing_id: parsed.data.listing_id,
    p_starts_at: new Date(parsed.data.starts_at).toISOString(),
    p_ends_at: new Date(parsed.data.ends_at).toISOString(),
    p_quantity: parsed.data.quantity,
    p_message: parsed.data.message ?? null,
  });

  if (error) return { error: humanError(error.message) };

  const ctx = await loadBookingEmailCtx(supabase, data.id);
  if (ctx) await emailBookingRequested(ctx);

  redirect(`/booking/${data.id}`);
}

export async function respondToBooking(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id"));
  const accept = formData.get("accept") === "true";
  const reason = String(formData.get("reason") || "") || null;

  const { error } = await supabase.rpc("respond_to_booking", {
    p_booking_id: bookingId,
    p_accept: accept,
    p_reason: reason,
  });

  if (error) return { error: humanError(error.message) };

  const ctx = await loadBookingEmailCtx(supabase, bookingId);
  if (ctx) await (accept ? emailBookingAccepted(ctx) : emailBookingDeclined(ctx));

  revalidatePath(`/booking/${bookingId}`);
  revalidatePath("/my/bookings");
  return { ok: true as const };
}

export async function cancelBooking(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id"));
  const reason = String(formData.get("reason") || "") || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
  });
  if (error) return { error: humanError(error.message) };

  const ctx = await loadBookingEmailCtx(supabase, bookingId);
  if (ctx) {
    const cancelledBy = user?.id === ctx.booking.owner_id ? "owner" : "renter";
    await emailBookingCancelled(ctx, cancelledBy);
  }

  revalidatePath(`/booking/${bookingId}`);
  revalidatePath("/my/bookings");
  return { ok: true as const };
}

export async function confirmPickup(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id"));
  const code = String(formData.get("code") || "");

  const { error } = await supabase.rpc("confirm_pickup", {
    p_booking_id: bookingId,
    p_code: code,
  });
  if (error) return { error: humanError(error.message) };

  const ctx = await loadBookingEmailCtx(supabase, bookingId);
  if (ctx) await emailHandoverConfirmed(ctx, "pickup");

  revalidatePath(`/booking/${bookingId}`);
  return { ok: true as const };
}

export async function confirmReturn(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const bookingId = String(formData.get("booking_id"));

  const { error } = await supabase.rpc("confirm_return", { p_booking_id: bookingId });
  if (error) return { error: humanError(error.message) };

  const ctx = await loadBookingEmailCtx(supabase, bookingId);
  if (ctx) await emailHandoverConfirmed(ctx, "return");

  revalidatePath(`/booking/${bookingId}`);
  return { ok: true as const };
}

/** Contrôle photo à la remise ou au retour. */
export async function saveHandoverCheck(_prev: unknown, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const bookingId = String(formData.get("booking_id"));
  const phase = String(formData.get("phase")) as "pickup" | "return";
  const conditionOk = formData.get("condition_ok") === "on";
  const notes = String(formData.get("notes") || "") || null;
  const paths = formData
    .getAll("photo_paths")
    .map(String)
    .filter(Boolean);

  const { error } = await supabase.from("handover_checks").insert({
    booking_id: bookingId,
    phase,
    by_user_id: user.id,
    photo_paths: paths,
    condition_ok: conditionOk,
    notes,
  });

  if (error) return { error: humanError(error.message) };

  revalidatePath(`/booking/${bookingId}`);
  return { ok: true as const };
}

export async function submitReview(_prev: unknown, formData: FormData) {
  const supabase = await createClient();

  const parsed = reviewSchema.safeParse({
    booking_id: formData.get("booking_id"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const { data, error } = await supabase.rpc("submit_review", {
    p_booking_id: parsed.data.booking_id,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment ?? null,
  });
  if (error) return { error: humanError(error.message) };

  if (data?.is_published) {
    const ctx = await loadBookingEmailCtx(supabase, parsed.data.booking_id);
    if (ctx) await emailReviewPublished(ctx);
  }

  revalidatePath(`/booking/${parsed.data.booking_id}`);
  return { ok: true as const };
}

export async function openDispute(_prev: unknown, formData: FormData) {
  const supabase = await createClient();

  const parsed = disputeSchema.safeParse({
    booking_id: formData.get("booking_id"),
    reason: formData.get("reason"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const { error } = await supabase.rpc("open_dispute", {
    p_booking_id: parsed.data.booking_id,
    p_reason: parsed.data.reason,
    p_description: parsed.data.description,
    p_photos: [],
  });
  if (error) return { error: humanError(error.message) };

  revalidatePath(`/booking/${parsed.data.booking_id}`);
  return { ok: true as const };
}
