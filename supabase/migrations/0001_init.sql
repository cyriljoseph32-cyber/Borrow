-- Borrow — schéma initial
-- Tous les montants sont en satang (1 THB = 100 satang), en entiers. Jamais de flottants.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ─────────────────────────── types ───────────────────────────
create type listing_kind      as enum ('item','service');
create type price_unit        as enum ('hour','session','day');
create type listing_status    as enum ('draft','pending_review','published','paused','archived');
create type booking_status    as enum ('requested','accepted','declined','expired',
                                       'cancelled_by_renter','cancelled_by_owner',
                                       'in_progress','completed','disputed');
create type payment_status    as enum ('none','fee_pending','fee_paid','refunded','failed');
create type handover_phase    as enum ('pickup','return');
create type dispute_status    as enum ('open','resolved_renter','resolved_owner','closed');
create type availability_kind as enum ('blocked','open');
create type user_role         as enum ('user','admin');

-- ─────────────────────────── profils ───────────────────────────
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text,
  full_name         text not null default '',
  avatar_url        text,
  bio               text,
  area              text,
  languages         text[] not null default '{}',
  phone             text,
  phone_verified    boolean not null default false,
  role              user_role not null default 'user',
  is_banned         boolean not null default false,
  stripe_account_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─────────────────────────── catégories ───────────────────────────
create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid references public.categories(id) on delete cascade,
  slug            text not null unique,
  name_en         text not null,
  name_th         text,
  accepts         listing_kind[] not null default '{item,service}',
  requires_review boolean not null default false,
  sort_order      int not null default 0
);
create index categories_parent_idx on public.categories (parent_id, sort_order);

-- ─────────────────────────── annonces ───────────────────────────
create table public.listings (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles(id) on delete cascade,
  kind               listing_kind not null,
  category_id        uuid not null references public.categories(id),
  title              text not null check (char_length(title) between 3 and 120),
  description        text not null default '',
  area               text not null,
  lat                numeric(9,6),
  lng                numeric(9,6),
  currency           char(3) not null default 'THB',
  price_amount       int not null check (price_amount > 0),
  price_unit         price_unit not null,
  price_week_amount  int check (price_week_amount > 0),
  price_month_amount int check (price_month_amount > 0),
  deposit_amount     int not null default 0 check (deposit_amount >= 0),
  condition_notes    text,
  duration_minutes   int check (duration_minutes > 0),
  capacity           int not null default 1 check (capacity between 1 and 50),
  status             listing_status not null default 'draft',
  published_at       timestamptz,
  view_count         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint item_has_no_duration   check (kind <> 'item'    or duration_minutes is null),
  constraint service_has_duration   check (kind <> 'service' or duration_minutes is not null),
  constraint service_has_no_deposit check (kind <> 'service' or deposit_amount = 0),
  constraint unit_matches_kind check (
    (kind = 'item'    and price_unit = 'day') or
    (kind = 'service' and price_unit in ('hour','session'))
  )
);

create index listings_browse_idx on public.listings (status, kind, category_id, created_at desc);
create index listings_owner_idx  on public.listings (owner_id, status);

alter table public.listings add column search_tsv tsvector
  generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(area,''))
  ) stored;
create index listings_search_idx on public.listings using gin (search_tsv);

create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index listing_photos_listing_idx on public.listing_photos (listing_id, sort_order);

-- ─────────────────────────── disponibilités ───────────────────────────
-- objet   : disponible par défaut, le prêteur pose des 'blocked'
-- service : indisponible par défaut, le prestataire pose des 'open'
create table public.availability (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  kind       availability_kind not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index availability_listing_idx on public.availability (listing_id, starts_at, ends_at);

-- ─────────────────────────── réservations ───────────────────────────
create table public.bookings (
  id                       uuid primary key default gen_random_uuid(),
  listing_id               uuid not null references public.listings(id) on delete restrict,
  renter_id                uuid not null references public.profiles(id) on delete restrict,
  owner_id                 uuid not null references public.profiles(id) on delete restrict,
  kind                     listing_kind not null,
  starts_at                timestamptz not null,
  ends_at                  timestamptz not null,
  quantity                 int not null default 1 check (quantity > 0),
  currency                 char(3) not null default 'THB',
  price_amount             int not null check (price_amount >= 0),
  deposit_amount           int not null default 0,
  service_fee_amount       int not null default 0,
  status                   booking_status not null default 'requested',
  payment_status           payment_status not null default 'none',
  handover_code            text,
  stripe_session_id        text,
  stripe_payment_intent_id text,
  renter_message           text,
  decline_reason           text,
  cancellation_reason      text,
  requested_at             timestamptz not null default now(),
  responded_at             timestamptz,
  expires_at               timestamptz not null default (now() + interval '48 hours'),
  started_at               timestamptz,
  completed_at             timestamptz,
  cancelled_at             timestamptz,
  created_at               timestamptz not null default now(),

  check (ends_at > starts_at),
  check (renter_id <> owner_id)
);

create index bookings_renter_idx  on public.bookings (renter_id, status, starts_at desc);
create index bookings_owner_idx   on public.bookings (owner_id, status, starts_at desc);
create index bookings_listing_idx on public.bookings (listing_id, starts_at);
create unique index bookings_session_idx on public.bookings (stripe_session_id)
  where stripe_session_id is not null;

-- Empêche physiquement le double-booking, quoi que fasse le code applicatif.
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    listing_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = any (array['accepted'::booking_status,'in_progress'::booking_status]));

create table public.booking_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  from_status booking_status,
  to_status   booking_status not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);

-- ─────────────────────────── remise / retour ───────────────────────────
create table public.handover_checks (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  phase        handover_phase not null,
  by_user_id   uuid not null references public.profiles(id),
  photo_paths  text[] not null default '{}',
  condition_ok boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  unique (booking_id, phase, by_user_id)
);

-- ─────────────────────────── messagerie ───────────────────────────
create table public.threads (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  renter_id       uuid not null references public.profiles(id) on delete cascade,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  booking_id      uuid references public.bookings(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (listing_id, renter_id)
);
create index threads_participants_idx on public.threads (renter_id, owner_id, last_message_at desc);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.threads(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_id, created_at desc);

create or replace function public.bump_thread()
returns trigger language plpgsql as $$
begin
  update public.threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end $$;
create trigger messages_bump_thread after insert on public.messages
  for each row execute function public.bump_thread();

-- ─────────────────────────── avis ───────────────────────────
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid not null references public.profiles(id) on delete cascade,
  rating       int not null check (rating between 1 and 5),
  comment      text,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (booking_id, author_id)
);
create index reviews_subject_idx on public.reviews (subject_id, is_published, created_at desc);

-- ─────────────────────────── certifications ───────────────────────────
create table public.credentials (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  kind          text not null,
  reference     text,
  issuer        text,
  expires_on    date,
  document_path text,
  verified_at   timestamptz,
  verified_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index credentials_profile_idx on public.credentials (profile_id);

-- ─────────────────────────── litiges & signalements ───────────────────────────
create table public.disputes (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  opened_by       uuid not null references public.profiles(id),
  reason          text not null,
  description     text not null,
  photo_paths     text[] not null default '{}',
  status          dispute_status not null default 'open',
  resolution_note text,
  resolved_by     uuid references public.profiles(id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index disputes_status_idx on public.disputes (status, created_at desc);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id  uuid references public.listings(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete cascade,
  reason      text not null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table public.category_suggestions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label      text not null,
  parent_id  uuid references public.categories(id),
  status     text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ─────────────────────────── vue publique : statistiques de profil ───────────────────────────
create or replace view public.profile_stats as
  select p.id as profile_id,
         coalesce(round(avg(r.rating)::numeric, 2), 0)                     as avg_rating,
         count(r.id) filter (where r.is_published)                         as review_count,
         (select count(*) from public.bookings b
           where b.owner_id = p.id and b.status = 'completed')             as completed_as_owner,
         (select count(*) from public.bookings b
           where b.renter_id = p.id and b.status = 'completed')            as completed_as_renter
    from public.profiles p
    left join public.reviews r on r.subject_id = p.id and r.is_published
   group by p.id;

-- ─────────────────────────── stockage ───────────────────────────
insert into storage.buckets (id, name, public) values
  ('listing-photos','listing-photos', true),
  ('avatars','avatars', true),
  ('handover-photos','handover-photos', false),
  ('credentials','credentials', false)
on conflict (id) do nothing;
