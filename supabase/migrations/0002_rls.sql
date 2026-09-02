-- Borrow — Row Level Security
--
-- RÈGLE D'OR : aucun client n'écrit jamais un statut de réservation.
-- Toutes les transitions passent par les fonctions `security definer` de 0003_functions.sql.
-- Il n'y a donc volontairement AUCUNE politique d'UPDATE ni d'INSERT sur `bookings`.

alter table public.profiles             enable row level security;
alter table public.categories           enable row level security;
alter table public.listings             enable row level security;
alter table public.listing_photos       enable row level security;
alter table public.availability         enable row level security;
alter table public.bookings             enable row level security;
alter table public.booking_events       enable row level security;
alter table public.handover_checks      enable row level security;
alter table public.threads              enable row level security;
alter table public.messages             enable row level security;
alter table public.reviews              enable row level security;
alter table public.credentials          enable row level security;
alter table public.disputes             enable row level security;
alter table public.reports              enable row level security;
alter table public.category_suggestions enable row level security;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

create or replace function public.is_booking_party(p_booking_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b
     where b.id = p_booking_id and (b.renter_id = auth.uid() or b.owner_id = auth.uid())
  );
$$;

create or replace function public.owns_listing(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.listings l where l.id = p_listing_id and l.owner_id = auth.uid()
  );
$$;

-- ─────────────── profils ───────────────
-- Lecture publique : nécessaire pour afficher le prêteur sur une annonce.
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ─────────────── catégories ───────────────
create policy categories_read  on public.categories for select using (true);
create policy categories_write on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────── annonces ───────────────
create policy listings_read on public.listings for select
  using (status = 'published' or owner_id = auth.uid() or public.is_admin());
create policy listings_insert on public.listings for insert
  with check (owner_id = auth.uid());
create policy listings_update on public.listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
create policy listings_delete on public.listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ─────────────── photos d'annonce ───────────────
create policy listing_photos_read on public.listing_photos for select
  using (exists (select 1 from public.listings l
                  where l.id = listing_id
                    and (l.status = 'published' or l.owner_id = auth.uid() or public.is_admin())));
create policy listing_photos_write on public.listing_photos for all
  using (public.owns_listing(listing_id))
  with check (public.owns_listing(listing_id));

-- ─────────────── disponibilités ───────────────
-- Lecture publique : le calendrier doit être visible avant réservation.
create policy availability_read  on public.availability for select using (true);
create policy availability_write on public.availability for all
  using (public.owns_listing(listing_id))
  with check (public.owns_listing(listing_id));

-- ─────────────── réservations ───────────────
create policy bookings_read on public.bookings for select
  using (renter_id = auth.uid() or owner_id = auth.uid() or public.is_admin());
-- pas d'insert / update / delete : tout passe par les RPC

create policy booking_events_read on public.booking_events for select
  using (public.is_booking_party(booking_id) or public.is_admin());

-- ─────────────── remise / retour ───────────────
create policy handover_read on public.handover_checks for select
  using (public.is_booking_party(booking_id) or public.is_admin());
create policy handover_insert on public.handover_checks for insert
  with check (
    by_user_id = auth.uid()
    and exists (select 1 from public.bookings b
                 where b.id = booking_id
                   and (b.renter_id = auth.uid() or b.owner_id = auth.uid())
                   and b.status in ('accepted','in_progress'))
  );

-- ─────────────── messagerie ───────────────
create policy threads_read on public.threads for select
  using (renter_id = auth.uid() or owner_id = auth.uid() or public.is_admin());
create policy threads_insert on public.threads for insert
  with check (renter_id = auth.uid());

create policy messages_read on public.messages for select
  using (exists (select 1 from public.threads t
                  where t.id = thread_id
                    and (t.renter_id = auth.uid() or t.owner_id = auth.uid())));
create policy messages_insert on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.threads t
                 where t.id = thread_id
                   and (t.renter_id = auth.uid() or t.owner_id = auth.uid()))
  );
create policy messages_update_read on public.messages for update
  using (exists (select 1 from public.threads t
                  where t.id = thread_id
                    and (t.renter_id = auth.uid() or t.owner_id = auth.uid())))
  with check (true);

-- ─────────────── avis ───────────────
-- Écriture uniquement via submit_review() : pas de politique d'insert.
create policy reviews_read on public.reviews for select
  using (is_published or author_id = auth.uid() or public.is_admin());

-- ─────────────── certifications ───────────────
create policy credentials_owner on public.credentials for all
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- ─────────────── litiges & signalements ───────────────
create policy disputes_read on public.disputes for select
  using (public.is_booking_party(booking_id) or public.is_admin());
create policy disputes_admin on public.disputes for update
  using (public.is_admin()) with check (public.is_admin());

create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid());
create policy reports_read   on public.reports for select using (public.is_admin());

create policy cat_sugg_insert on public.category_suggestions for insert
  with check (profile_id = auth.uid());
create policy cat_sugg_read on public.category_suggestions for select
  using (profile_id = auth.uid() or public.is_admin());

-- ─────────────── stockage ───────────────
-- Convention de chemin : {user_id}/{...}. Les buckets privés n'ont aucune politique de
-- lecture : l'accès se fait par URL signée générée côté serveur.

create policy "listing photos are public" on storage.objects for select
  using (bucket_id = 'listing-photos');
create policy "upload own listing photos" on storage.objects for insert
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own listing photos" on storage.objects for delete
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars are public" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "upload own avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own avatar" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "upload own handover photos" on storage.objects for insert
  with check (bucket_id = 'handover-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own handover photos" on storage.objects for select
  using (bucket_id = 'handover-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "upload own credentials" on storage.objects for insert
  with check (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own credentials" on storage.objects for select
  using (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);
