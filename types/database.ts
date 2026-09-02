// Types de la base Borrow.
// Écrits à la main pour correspondre à supabase/migrations/*.sql.
// Une fois le projet Supabase lié, régénérer avec :  npm run db:types

export type ListingKind = "item" | "service";
export type PriceUnit = "hour" | "session" | "day";
export type ListingStatus = "draft" | "pending_review" | "published" | "paused" | "archived";
export type BookingStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled_by_renter"
  | "cancelled_by_owner"
  | "in_progress"
  | "completed"
  | "disputed";
export type PaymentStatus = "none" | "fee_pending" | "fee_paid" | "refunded" | "failed";
export type HandoverPhase = "pickup" | "return";
export type DisputeStatus = "open" | "resolved_renter" | "resolved_owner" | "closed";
export type AvailabilityKind = "blocked" | "open";
export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  area: string | null;
  languages: string[];
  phone: string | null;
  phone_verified: boolean;
  role: UserRole;
  is_banned: boolean;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  slug: string;
  name_en: string;
  name_th: string | null;
  accepts: ListingKind[];
  requires_review: boolean;
  sort_order: number;
}

export interface Listing {
  id: string;
  owner_id: string;
  kind: ListingKind;
  category_id: string;
  title: string;
  description: string;
  area: string;
  lat: number | null;
  lng: number | null;
  currency: string;
  price_amount: number;
  price_unit: PriceUnit;
  price_week_amount: number | null;
  price_month_amount: number | null;
  deposit_amount: number;
  condition_notes: string | null;
  duration_minutes: number | null;
  capacity: number;
  status: ListingStatus;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface Availability {
  id: string;
  listing_id: string;
  kind: AvailabilityKind;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface Booking {
  id: string;
  listing_id: string;
  renter_id: string;
  owner_id: string;
  kind: ListingKind;
  starts_at: string;
  ends_at: string;
  quantity: number;
  currency: string;
  price_amount: number;
  deposit_amount: number;
  service_fee_amount: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  handover_code: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  renter_message: string | null;
  decline_reason: string | null;
  cancellation_reason: string | null;
  requested_at: string;
  responded_at: string | null;
  expires_at: string;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface BookingEvent {
  id: string;
  booking_id: string;
  actor_id: string | null;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  note: string | null;
  created_at: string;
}

export interface HandoverCheck {
  id: string;
  booking_id: string;
  phase: HandoverPhase;
  by_user_id: string;
  photo_paths: string[];
  condition_ok: boolean;
  notes: string | null;
  created_at: string;
}

export interface Thread {
  id: string;
  listing_id: string;
  renter_id: string;
  owner_id: string;
  booking_id: string | null;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  author_id: string;
  subject_id: string;
  rating: number;
  comment: string | null;
  is_published: boolean;
  created_at: string;
}

export interface Credential {
  id: string;
  profile_id: string;
  kind: string;
  reference: string | null;
  issuer: string | null;
  expires_on: string | null;
  document_path: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  booking_id: string;
  opened_by: string;
  reason: string;
  description: string;
  photo_paths: string[];
  status: DisputeStatus;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ProfileStats {
  profile_id: string;
  avg_rating: number;
  review_count: number;
  completed_as_owner: number;
  completed_as_renter: number;
}

export interface Quote {
  price_amount: number;
  deposit_amount: number;
  service_fee_amount: number;
  total_due_now: number;
}

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };

export interface Database {
  public: {
    Tables: {
      profiles: Row<Profile>;
      categories: Row<Category>;
      listings: Row<Listing>;
      listing_photos: Row<ListingPhoto>;
      availability: Row<Availability>;
      bookings: Row<Booking>;
      booking_events: Row<BookingEvent>;
      handover_checks: Row<HandoverCheck>;
      threads: Row<Thread>;
      messages: Row<Message>;
      reviews: Row<Review>;
      credentials: Row<Credential>;
      disputes: Row<Dispute>;
    };
    Views: {
      profile_stats: { Row: ProfileStats };
    };
    Functions: {
      quote_booking: {
        Args: {
          p_listing_id: string;
          p_starts_at: string;
          p_ends_at: string;
          p_quantity?: number;
        };
        Returns: Quote[];
      };
      request_booking: {
        Args: {
          p_listing_id: string;
          p_starts_at: string;
          p_ends_at: string;
          p_quantity?: number;
          p_message?: string | null;
        };
        Returns: Booking;
      };
      respond_to_booking: {
        Args: { p_booking_id: string; p_accept: boolean; p_reason?: string | null };
        Returns: Booking;
      };
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string | null };
        Returns: Booking;
      };
      confirm_pickup: { Args: { p_booking_id: string; p_code: string }; Returns: Booking };
      confirm_return: { Args: { p_booking_id: string }; Returns: Booking };
      submit_review: {
        Args: { p_booking_id: string; p_rating: number; p_comment?: string | null };
        Returns: Review;
      };
      open_dispute: {
        Args: {
          p_booking_id: string;
          p_reason: string;
          p_description: string;
          p_photos?: string[];
        };
        Returns: Dispute;
      };
      publish_listing: { Args: { p_listing_id: string }; Returns: Listing };
      approve_listing: { Args: { p_listing_id: string }; Returns: Listing };
      increment_view_count: { Args: { p_listing_id: string }; Returns: undefined };
      expire_stale_requests: { Args: Record<string, never>; Returns: number };
      publish_stale_reviews: { Args: Record<string, never>; Returns: number };
      fee_is_refundable: { Args: { p_booking_id: string }; Returns: boolean };
      is_admin: { Args: { uid?: string }; Returns: boolean };
    };
    Enums: {
      listing_kind: ListingKind;
      price_unit: PriceUnit;
      listing_status: ListingStatus;
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      handover_phase: HandoverPhase;
      dispute_status: DisputeStatus;
      availability_kind: AvailabilityKind;
      user_role: UserRole;
    };
  };
}
