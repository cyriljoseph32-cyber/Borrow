/**
 * Barème de frais et calcul de durée — MIROIR de compute_price() et
 * borrow_service_fee() en base (supabase/migrations/0003_functions.sql).
 *
 * ⚠️ Ces fonctions servent UNIQUEMENT à l'affichage. Le montant qui fait foi est
 * toujours celui calculé par Postgres au moment de request_booking(). Si tu
 * modifies un barème ici, modifie-le aussi dans la migration, et inversement.
 */

import type { Listing, ListingKind } from "@/types/database";

/** Barème Borrow, en satang (1 THB = 100 satang). */
export function serviceFee(amount: number): number {
  if (amount < 100_000) return 4_900; //  49 THB
  if (amount < 300_000) return 9_900; //  99 THB
  if (amount < 600_000) return 17_900; // 179 THB
  if (amount < 1_200_000) return 29_900; // 299 THB
  return Math.min(Math.round(amount * 0.025), 90_000); // 2,5 %, plafond 900 THB
}

export const FEE_TIERS = [
  { upTo: 1_000, fee: 49 },
  { upTo: 3_000, fee: 99 },
  { upTo: 6_000, fee: 179 },
  { upTo: 12_000, fee: 299 },
] as const;

/** Nombre de jours facturés pour un objet : au moins 1. */
export function billableDays(startsAt: Date, endsAt: Date): number {
  const ms = endsAt.getTime() - startsAt.getTime();
  return Math.max(Math.ceil(ms / 86_400_000), 1);
}

type PricingListing = Pick<
  Listing,
  "kind" | "price_amount" | "price_week_amount" | "price_month_amount"
>;

/** Prix de la location, hors caution et hors frais Borrow. */
export function computePrice(
  listing: PricingListing,
  startsAt: Date,
  endsAt: Date,
  quantity = 1,
): number {
  if (listing.kind === "service") {
    return listing.price_amount * Math.max(quantity, 1);
  }

  const days = billableDays(startsAt, endsAt);
  let total = listing.price_amount * days;

  if (listing.price_week_amount && days >= 7) {
    total = Math.min(
      total,
      Math.floor(days / 7) * listing.price_week_amount + (days % 7) * listing.price_amount,
    );
  }
  if (listing.price_month_amount && days >= 30) {
    total = Math.min(
      total,
      Math.floor(days / 30) * listing.price_month_amount + (days % 30) * listing.price_amount,
    );
  }

  return total;
}

export interface Estimate {
  days: number;
  price: number;
  deposit: number;
  fee: number;
  dueNow: number;
  dueAtHandover: number;
}

export function estimate(
  listing: PricingListing & { deposit_amount: number },
  startsAt: Date,
  endsAt: Date,
  quantity = 1,
): Estimate {
  const price = computePrice(listing, startsAt, endsAt, quantity);
  const fee = serviceFee(price);
  return {
    days: listing.kind === "item" ? billableDays(startsAt, endsAt) : 1,
    price,
    deposit: listing.deposit_amount,
    fee,
    dueNow: fee,
    dueAtHandover: price + listing.deposit_amount,
  };
}

export function unitLabel(kind: ListingKind, unit: string): string {
  if (kind === "service") return unit === "hour" ? "/ hour" : "/ session";
  return "/ day";
}
