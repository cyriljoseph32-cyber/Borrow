import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Le webhook doit lire le corps brut : pas de parsing par Next.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signature invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const bookingId = session.metadata?.booking_id ?? session.client_reference_id;
      if (!bookingId) break;

      // Idempotent : on ne repasse pas en fee_paid une réservation déjà payée,
      // et on ne régénère pas le code de remise.
      const { data: existing } = await supabase
        .from("bookings")
        .select("payment_status,handover_code")
        .eq("id", bookingId)
        .single();

      if (existing?.payment_status === "fee_paid") break;

      const code =
        existing?.handover_code ??
        Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "X");

      await supabase
        .from("bookings")
        .update({
          payment_status: "fee_paid",
          handover_code: code,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", bookingId);

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const bookingId = session.metadata?.booking_id;
      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ stripe_session_id: null })
          .eq("id", bookingId)
          .eq("payment_status", "fee_pending");
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (intentId) {
        await supabase
          .from("bookings")
          .update({ payment_status: "refunded" })
          .eq("stripe_payment_intent_id", intentId);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const bookingId = intent.metadata?.booking_id;
      if (bookingId) {
        await supabase.from("bookings").update({ payment_status: "failed" }).eq("id", bookingId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
