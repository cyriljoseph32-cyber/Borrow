import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { payments } from "@/lib/payments";

export async function POST(request: NextRequest) {
  const { bookingId } = (await request.json()) as { bookingId?: string };
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId manquant" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // La RLS garantit déjà que l'utilisateur est partie prenante.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id,renter_id,status,payment_status,service_fee_amount,currency,listings(title)")
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.renter_id !== user.id) {
    return NextResponse.json({ error: "Only the renter pays the fee" }, { status: 403 });
  }
  if (booking.status !== "accepted") {
    return NextResponse.json({ error: "The owner has not accepted yet" }, { status: 409 });
  }
  if (booking.payment_status === "fee_paid") {
    return NextResponse.json({ error: "Already paid" }, { status: 409 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  try {
    const { sessionId, url } = await payments.createFeeCheckout({
      bookingId: booking.id,
      amount: booking.service_fee_amount,
      currency: booking.currency,
      listingTitle: (booking.listings as unknown as { title: string })?.title ?? "Borrow booking",
      successUrl: `${site}/booking/${booking.id}?paid=1`,
      cancelUrl: `${site}/booking/${booking.id}`,
      customerEmail: user.email ?? undefined,
    });

    // Clé de service : le client n'a pas le droit d'écrire sur `bookings`.
    await createAdminClient()
      .from("bookings")
      .update({ stripe_session_id: sessionId })
      .eq("id", booking.id);

    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
