export const AREAS = [
  "Lamai",
  "Chaweng",
  "Bophut / Fisherman's Village",
  "Maenam",
  "Bangrak / Big Buddha",
  "Plai Laem",
  "Nathon",
  "Taling Ngam",
  "Other",
] as const;

export const LANGUAGES = ["English", "ไทย", "Français", "Deutsch", "Svenska", "Русский"] as const;

export const CREDENTIAL_KINDS = [
  { value: "diving_instructor", label: "Diving instructor (PADI / SSI / …)" },
  { value: "first_aid", label: "First aid / EFR" },
  { value: "coach", label: "Sports coach" },
  { value: "insurance", label: "Liability insurance" },
  { value: "other", label: "Other" },
] as const;

/** Messages d'erreur des RPC Postgres, traduits pour l'utilisateur. */
export const RPC_ERRORS: Record<string, string> = {
  not_authenticated: "You need to be signed in.",
  account_banned: "This account has been suspended.",
  phone_not_verified: "Verify your phone number before booking or publishing.",
  listing_not_available: "This listing is no longer available.",
  cannot_book_own_listing: "You cannot book your own listing.",
  invalid_dates: "The end must be after the start.",
  dates_in_past: "Those dates are in the past.",
  capacity_exceeded: "Too many participants for this listing.",
  unavailable_period: "The owner has blocked those dates.",
  no_open_slot: "No open slot covers that time.",
  slot_taken: "Someone already booked that period.",
  not_found: "Not found.",
  not_owner: "Only the owner can do that.",
  not_a_party: "You are not part of this booking.",
  bad_status: "This action is not possible at this stage.",
  request_expired: "This request has expired.",
  fee_unpaid: "The service fee has not been paid yet.",
  bad_code: "Wrong handover code.",
  photo_required: "Add at least one photo before publishing.",
  not_completed: "The booking is not finished yet.",
  review_window_closed: "The 14-day review window has closed.",
  dispute_window_closed: "The 7-day dispute window has closed.",
  not_admin: "Admins only.",
};

export function humanError(message?: string | null): string {
  if (!message) return "Something went wrong.";
  for (const key of Object.keys(RPC_ERRORS)) {
    if (message.includes(key)) return RPC_ERRORS[key];
  }
  return message;
}
