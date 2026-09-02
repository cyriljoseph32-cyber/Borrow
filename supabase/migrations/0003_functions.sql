-- Borrow — logique métier en base
-- Toutes les transitions d'état passent par ici. Le client n'écrit jamais un statut.

-- ─────────────── prix et frais ───────────────

-- Barème de frais Borrow, en satang. 1 000 THB = 100 000 satang.
create or replace function public.borrow_service_fee(p_amount int)
returns int language sql immutable as $$
  select case
    when p_amount <  100000 then   4900   --   49 THB
    when p_amount <  300000 then   9900   --   99 THB
    when p_amount <  600000 then  17900   --  179 THB
    when p_amount < 1200000 then  29900   --  299 THB
    else least((p_amount * 0.025)::int, 90000)   -- 2,5 %, plafond 900 THB
  end;
$$;

create or replace function public.compute_price(
  p_listing   public.listings,
  p_starts_at timestamptz,
  p_ends_at   timestamptz,
  p_quantity  int
) returns int language plpgsql immutable as $$
declare v_days int; v_total int;
begin
  if p_listing.kind = 'service' then
    return p_listing.price_amount * greatest(p_quantity, 1);
  end if;

  v_days  := greatest(ceil(extract(epoch from (p_ends_at - p_starts_at)) / 86400.0)::int, 1);
  v_total := p_listing.price_amount * v_days;

  if p_listing.price_week_amount is not null and v_days >= 7 then
    v_total := least(v_total,
      (v_days / 7) * p_listing.price_week_amount + (v_days % 7) * p_listing.price_amount);
  end if;
  if p_listing.price_month_amount is not null and v_days >= 30 then
    v_total := least(v_total,
      (v_days / 30) * p_listing.price_month_amount + (v_days % 30) * p_listing.price_amount);
  end if;

  return v_total;
end $$;

-- Devis affiché avant réservation. Le client ne calcule jamais un prix lui-même.
create or replace function public.quote_booking(
  p_listing_id uuid,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_quantity   int default 1
) returns table (price_amount int, deposit_amount int, service_fee_amount int, total_due_now int)
language plpgsql stable security definer set search_path = public as $$
declare v_listing public.listings; v_price int; v_fee int;
begin
  select * into v_listing from public.listings where id = p_listing_id and status = 'published';
  if v_listing is null then raise exception 'listing_not_available'; end if;

  v_price := public.compute_price(v_listing, p_starts_at, p_ends_at, p_quantity);
  v_fee   := public.borrow_service_fee(v_price);

  return query select v_price, v_listing.deposit_amount, v_fee, v_fee;
end $$;

create or replace function public.gen_handover_code()
returns text language sql volatile as $$
  select upper(substring(encode(gen_random_bytes(8),'hex') from 1 for 6));
$$;

-- ─────────────── publication d'une annonce ───────────────

create or replace function public.publish_listing(p_listing_id uuid)
returns public.listings
language plpgsql security definer set search_path = public as $$
declare v_l public.listings; v_cat public.categories; v_photos int;
begin
  select * into v_l from public.listings where id = p_listing_id for update;
  if v_l is null                then raise exception 'not_found'; end if;
  if v_l.owner_id <> auth.uid() then raise exception 'not_owner'; end if;

  select count(*) into v_photos from public.listing_photos where listing_id = p_listing_id;
  if v_photos = 0 then raise exception 'photo_required'; end if;

  select * into v_cat from public.categories where id = v_l.category_id;

  update public.listings set
    status = case when v_cat.requires_review and v_l.kind = 'service'
                  then 'pending_review'::listing_status
                  else 'published'::listing_status end,
    published_at = case when v_cat.requires_review and v_l.kind = 'service'
                        then null else now() end
   where id = p_listing_id
   returning * into v_l;

  return v_l;
end $$;

create or replace function public.approve_listing(p_listing_id uuid)
returns public.listings
language plpgsql security definer set search_path = public as $$
declare v_l public.listings;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.listings set status = 'published', published_at = now()
   where id = p_listing_id and status = 'pending_review'
   returning * into v_l;
  if v_l is null then raise exception 'not_found_or_not_pending'; end if;
  return v_l;
end $$;

-- ─────────────── cycle de vie d'une réservation ───────────────

create or replace function public.request_booking(
  p_listing_id uuid,
  p_starts_at  timestamptz,
  p_ends_at    timestamptz,
  p_quantity   int default 1,
  p_message    text default null
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_listing public.listings;
  v_profile public.profiles;
  v_price   int;
  v_booking public.bookings;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile is null            then raise exception 'not_authenticated';  end if;
  if v_profile.is_banned          then raise exception 'account_banned';     end if;
  if not v_profile.phone_verified then raise exception 'phone_not_verified'; end if;

  select * into v_listing from public.listings
   where id = p_listing_id and status = 'published';
  if v_listing is null                then raise exception 'listing_not_available';   end if;
  if v_listing.owner_id = auth.uid()  then raise exception 'cannot_book_own_listing'; end if;
  if p_ends_at <= p_starts_at         then raise exception 'invalid_dates';           end if;
  if p_starts_at < now()              then raise exception 'dates_in_past';           end if;
  if p_quantity > v_listing.capacity  then raise exception 'capacity_exceeded';       end if;

  -- objet : refuser si le prêteur a bloqué la période
  if v_listing.kind = 'item' and exists (
       select 1 from public.availability a
        where a.listing_id = p_listing_id and a.kind = 'blocked'
          and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
     ) then raise exception 'unavailable_period'; end if;

  -- service : exiger un créneau ouvert couvrant la demande
  if v_listing.kind = 'service' and not exists (
       select 1 from public.availability a
        where a.listing_id = p_listing_id and a.kind = 'open'
          and tstzrange(a.starts_at, a.ends_at, '[]') @> tstzrange(p_starts_at, p_ends_at, '[]')
     ) then raise exception 'no_open_slot'; end if;

  -- refuser si une réservation confirmée chevauche déjà
  if exists (
       select 1 from public.bookings b
        where b.listing_id = p_listing_id
          and b.status in ('accepted','in_progress')
          and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
     ) then raise exception 'slot_taken'; end if;

  v_price := public.compute_price(v_listing, p_starts_at, p_ends_at, p_quantity);

  insert into public.bookings (
    listing_id, renter_id, owner_id, kind, starts_at, ends_at, quantity,
    currency, price_amount, deposit_amount, service_fee_amount, renter_message
  ) values (
    p_listing_id, auth.uid(), v_listing.owner_id, v_listing.kind,
    p_starts_at, p_ends_at, p_quantity, v_listing.currency,
    v_price, v_listing.deposit_amount, public.borrow_service_fee(v_price), p_message
  ) returning * into v_booking;

  insert into public.booking_events (booking_id, actor_id, to_status)
  values (v_booking.id, auth.uid(), 'requested');

  insert into public.threads (listing_id, renter_id, owner_id, booking_id)
  values (p_listing_id, auth.uid(), v_listing.owner_id, v_booking.id)
  on conflict (listing_id, renter_id) do update set booking_id = excluded.booking_id;

  return v_booking;
end $$;

create or replace function public.respond_to_booking(
  p_booking_id uuid, p_accept boolean, p_reason text default null
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_b public.bookings;
begin
  select * into v_b from public.bookings where id = p_booking_id for update;
  if v_b is null                then raise exception 'not_found';        end if;
  if v_b.owner_id <> auth.uid() then raise exception 'not_owner';        end if;
  if v_b.status <> 'requested'  then raise exception 'bad_status';       end if;
  if now() > v_b.expires_at     then raise exception 'request_expired';  end if;

  -- Les littéraux d'un CASE doivent être castés : sinon Postgres les résout en `text`
  -- et refuse l'affectation à une colonne de type enum.
  update public.bookings set
    status         = case when p_accept then 'accepted'::booking_status
                                        else 'declined'::booking_status end,
    payment_status = case when p_accept then 'fee_pending'::payment_status
                                        else payment_status end,
    decline_reason = case when p_accept then null else p_reason end,
    responded_at   = now()
   where id = p_booking_id returning * into v_b;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, note)
  values (p_booking_id, auth.uid(), 'requested', v_b.status, p_reason);
  return v_b;
end $$;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_b public.bookings; v_old booking_status; v_new booking_status;
begin
  select * into v_b from public.bookings where id = p_booking_id for update;
  if v_b is null then raise exception 'not_found'; end if;
  if auth.uid() not in (v_b.renter_id, v_b.owner_id) then raise exception 'not_a_party'; end if;
  if v_b.status not in ('requested','accepted') then raise exception 'bad_status'; end if;

  v_old := v_b.status;
  v_new := case when auth.uid() = v_b.renter_id
                then 'cancelled_by_renter'::booking_status
                else 'cancelled_by_owner'::booking_status end;

  update public.bookings
     set status = v_new, cancellation_reason = p_reason, cancelled_at = now()
   where id = p_booking_id returning * into v_b;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, note)
  values (p_booking_id, auth.uid(), v_old, v_new, p_reason);
  return v_b;
end $$;

-- Détermine si les frais Borrow sont remboursables (règle des 48 h).
create or replace function public.fee_is_refundable(p_booking_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when b.status = 'cancelled_by_owner' then true
    when b.status = 'cancelled_by_renter' then b.starts_at - now() >= interval '48 hours'
    when b.status in ('declined','expired') then true
    else false
  end
  from public.bookings b where b.id = p_booking_id;
$$;

create or replace function public.confirm_pickup(p_booking_id uuid, p_code text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_b public.bookings;
begin
  select * into v_b from public.bookings where id = p_booking_id for update;
  if v_b is null                      then raise exception 'not_found';   end if;
  if v_b.owner_id <> auth.uid()       then raise exception 'not_owner';   end if;
  if v_b.status <> 'accepted'         then raise exception 'bad_status';  end if;
  if v_b.payment_status <> 'fee_paid' then raise exception 'fee_unpaid';  end if;
  if upper(coalesce(p_code,'')) <> v_b.handover_code then raise exception 'bad_code'; end if;

  update public.bookings set status = 'in_progress', started_at = now()
   where id = p_booking_id returning * into v_b;
  insert into public.booking_events (booking_id, actor_id, from_status, to_status)
  values (p_booking_id, auth.uid(), 'accepted', 'in_progress');
  return v_b;
end $$;

create or replace function public.confirm_return(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare v_b public.bookings;
begin
  select * into v_b from public.bookings where id = p_booking_id for update;
  if v_b is null                 then raise exception 'not_found';  end if;
  if v_b.owner_id <> auth.uid()  then raise exception 'not_owner';  end if;
  if v_b.status <> 'in_progress' then raise exception 'bad_status'; end if;

  update public.bookings set status = 'completed', completed_at = now()
   where id = p_booking_id returning * into v_b;
  insert into public.booking_events (booking_id, actor_id, from_status, to_status)
  values (p_booking_id, auth.uid(), 'in_progress', 'completed');
  return v_b;
end $$;

create or replace function public.open_dispute(
  p_booking_id uuid, p_reason text, p_description text, p_photos text[] default '{}'
) returns public.disputes
language plpgsql security definer set search_path = public as $$
declare v_b public.bookings; v_d public.disputes;
begin
  select * into v_b from public.bookings where id = p_booking_id for update;
  if v_b is null then raise exception 'not_found'; end if;
  if auth.uid() not in (v_b.renter_id, v_b.owner_id) then raise exception 'not_a_party'; end if;
  if v_b.status not in ('in_progress','completed') then raise exception 'bad_status'; end if;
  if v_b.completed_at is not null and now() > v_b.completed_at + interval '7 days'
     then raise exception 'dispute_window_closed'; end if;

  insert into public.disputes (booking_id, opened_by, reason, description, photo_paths)
  values (p_booking_id, auth.uid(), p_reason, p_description, p_photos)
  returning * into v_d;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, note)
  values (p_booking_id, auth.uid(), v_b.status, 'disputed', p_reason);

  update public.bookings set status = 'disputed' where id = p_booking_id;
  return v_d;
end $$;

-- ─────────────── avis ───────────────

create or replace function public.submit_review(
  p_booking_id uuid, p_rating int, p_comment text default null
) returns public.reviews
language plpgsql security definer set search_path = public as $$
declare v_b public.bookings; v_subject uuid; v_review public.reviews;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if v_b is null               then raise exception 'not_found';     end if;
  if v_b.status <> 'completed' then raise exception 'not_completed'; end if;
  if auth.uid() not in (v_b.renter_id, v_b.owner_id) then raise exception 'not_a_party'; end if;
  if now() > v_b.completed_at + interval '14 days' then raise exception 'review_window_closed'; end if;

  v_subject := case when auth.uid() = v_b.renter_id then v_b.owner_id else v_b.renter_id end;

  insert into public.reviews (booking_id, author_id, subject_id, rating, comment)
  values (p_booking_id, auth.uid(), v_subject, p_rating, p_comment)
  returning * into v_review;

  -- publication en double aveugle : dès que les deux ont écrit
  if (select count(*) from public.reviews where booking_id = p_booking_id) = 2 then
    update public.reviews set is_published = true where booking_id = p_booking_id;
    select * into v_review from public.reviews where id = v_review.id;  -- relire l'état publié
  end if;

  return v_review;
end $$;

-- ─────────────── tâches planifiées ───────────────

create or replace function public.expire_stale_requests()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with expired as (
    update public.bookings set status = 'expired'
     where status = 'requested' and now() > expires_at
     returning id
  ), logged as (
    insert into public.booking_events (booking_id, from_status, to_status, note)
    select id, 'requested', 'expired', 'auto' from expired
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end $$;

-- Publie les avis dont la fenêtre de 14 jours est écoulée, même sans réciprocité.
create or replace function public.publish_stale_reviews()
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with updated as (
    update public.reviews r set is_published = true
      from public.bookings b
     where b.id = r.booking_id
       and not r.is_published
       and b.completed_at is not null
       and now() > b.completed_at + interval '14 days'
     returning r.id
  )
  select count(*) into v_count from updated;
  return v_count;
end $$;

create or replace function public.increment_view_count(p_listing_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.listings set view_count = view_count + 1
   where id = p_listing_id and status = 'published';
$$;
