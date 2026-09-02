/**
 * Toute la logique de paiement passe par cette interface.
 * Si le compte Stripe Thaïlande pose problème (PromptPay), seule
 * l'implémentation change — pas le reste de l'application.
 */

export interface FeeCheckoutInput {
  bookingId: string;
  amount: number; // satang
  currency: string; // "THB"
  listingTitle: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface PaymentProvider {
  createFeeCheckout(input: FeeCheckoutInput): Promise<{ sessionId: string; url: string }>;
  refundFee(paymentIntentId: string): Promise<void>;
}

export { stripeProvider as payments } from "./stripe";
