import Stripe from "stripe";
import type { FeeCheckoutInput, PaymentProvider } from "./index";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
    client = new Stripe(key);
  }
  return client;
}

/**
 * PromptPay n'est disponible que si le compte Stripe est ouvert en Thaïlande.
 * Tant que ce n'est pas confirmé, on laisse STRIPE_ENABLE_PROMPTPAY à "false"
 * et on ne propose que la carte.
 */
function paymentMethods(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
  if (process.env.STRIPE_ENABLE_PROMPTPAY === "true") methods.push("promptpay");
  return methods;
}

export const stripeProvider: PaymentProvider = {
  async createFeeCheckout(input: FeeCheckoutInput) {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: paymentMethods(),
        customer_email: input.customerEmail,
        client_reference_id: input.bookingId,
        metadata: { booking_id: input.bookingId },
        payment_intent_data: { metadata: { booking_id: input.bookingId } },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: input.amount,
              product_data: {
                name: "Borrow service fee",
                description: input.listingTitle,
              },
            },
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      // Une seule session de paiement par réservation, même en cas de double clic.
      { idempotencyKey: `fee_${input.bookingId}` },
    );

    if (!session.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement");
    return { sessionId: session.id, url: session.url };
  },

  async refundFee(paymentIntentId: string) {
    await stripe().refunds.create(
      { payment_intent: paymentIntentId },
      { idempotencyKey: `refund_${paymentIntentId}` },
    );
  },
};
