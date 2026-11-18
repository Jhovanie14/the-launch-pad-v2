-- Lock down what a customer's own login (and the public anon key) can do
-- directly through the Supabase API, found in the 2026-11-18 security pass.
--
-- The anon key is public and every customer has a login, so anything an RLS
-- policy allows can be done from a browser console, skipping every check in
-- the app. Before this migration a customer could:
--   * make themselves an admin or super admin (profiles: FOR ALL on own row,
--     with role and user_type updatable and no trigger);
--   * give themselves an active membership (user_subscription insert/update);
--   * add any car to their membership without paying (subscription_vehicles insert);
--   * insert bookings with any date, price, status or "paid by card", even
--     signed out (bookings insert allows user_id IS NULL for every role);
--   * insert add-ons onto any booking, and read every booking's add-ons;
--   * read every promo code;
--   * insert vehicles while signed out, read every customer's car, and change
--     the plate on their own car (which swaps the car a membership covers).
--
-- All of these writes are done by the server with the service role, which
-- RLS does not apply to, so the app keeps working.
--
-- ORDER: deploy the code first (PR "fix/db-lockdown": createBooking saves with
-- the service role), THEN run this file in Supabase -> SQL Editor.
-- Every statement is safe to run twice.

-- -------------------------------------------------------------------------
-- Who is making the request? 'anon' or 'authenticated' = the public API with
-- a visitor's or customer's key. Server code uses 'service_role'; SQL run in
-- the dashboard and Supabase Auth itself have no JWT at all.
-- -------------------------------------------------------------------------
create or replace function public.request_jwt_role()
  returns text
  language sql
  stable
  set search_path = ''
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '')
$$;

-- =========================================================================
-- 1. profiles: read and update your own row, but never your role, account
--    type, email or id. No inserting or deleting profiles from the browser
--    (Supabase Auth creates them).
-- =========================================================================
drop policy if exists "users_manage_own_profile" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated
  using (auth.uid() = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.protect_profile_privileges()
  returns trigger
  language plpgsql
  set search_path = public
as $$
begin
  if public.request_jwt_role() in ('anon', 'authenticated') and (
       new.role is distinct from old.role
    or new.user_type is distinct from old.user_type
    or new.email is distinct from old.email
    or new.id is distinct from old.id
  ) then
    raise exception 'These account details can only be changed by the Launch Pad team.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- =========================================================================
-- 2. Memberships: customers read their own; only the server writes.
-- =========================================================================
drop policy if exists "Users can insert their own subscription" on public.user_subscription;
drop policy if exists "Users can update their own subscription" on public.user_subscription;
drop policy if exists "Insert if user owns subscription" on public.subscription_vehicles;

-- =========================================================================
-- 3. Bookings and their add-ons: only the server (and staff) create them.
-- =========================================================================
drop policy if exists "Users can create own bookings" on public.bookings;

drop policy if exists "Allow all inserts" on public.booking_add_ons;
drop policy if exists "Allow anyone to select booking add-ons" on public.booking_add_ons;
drop policy if exists "Allow insert for authenticated users" on public.booking_add_ons;
-- ("Allow select for authenticated users" -- a customer's own booking -- stays.)
drop policy if exists "Admins manage booking add-ons" on public.booking_add_ons;
create policy "Admins manage booking add-ons" on public.booking_add_ons
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- 4. Promo codes: staff only. The booking page checks codes on the server.
-- =========================================================================
drop policy if exists "Allow user to select promo" on public.promo_codes;
drop policy if exists "Admins read promo codes" on public.promo_codes;
create policy "Admins read promo codes" on public.promo_codes
  for select to authenticated
  using (public.is_admin());

alter table public.promo_code_redemptions enable row level security;
drop policy if exists "Admins read promo redemptions" on public.promo_code_redemptions;
create policy "Admins read promo redemptions" on public.promo_code_redemptions
  for select to authenticated
  using (public.is_admin());

-- =========================================================================
-- 5. Vehicles.
-- =========================================================================
-- No inserts while signed out (guest bookings save the car on the server).
drop policy if exists "Allow insert for guests" on public.vehicles;

-- Signed-in customers add cars for themselves only.
drop policy if exists "Enable insert for authenticated users only" on public.vehicles;
drop policy if exists "Users add own vehicles" on public.vehicles;
create policy "Users add own vehicles" on public.vehicles
  for insert to authenticated
  with check (user_id = auth.uid() or user_id is null or public.is_admin());

-- Read your own cars, unowned cars (guest and membership cars, which the
-- "add a car" screen looks up by plate), cars on your membership, and staff
-- read everything. No more reading every customer's car.
drop policy if exists "Authenticated can read vehicles" on public.vehicles;
drop policy if exists "Read own, unowned, member and staff vehicles" on public.vehicles;
create policy "Read own, unowned, member and staff vehicles" on public.vehicles
  for select to authenticated
  using (
    user_id = auth.uid()
    or user_id is null
    or public.is_admin()
    or exists (
      select 1
      from public.subscription_vehicles sv
      join public.user_subscription us on us.id = sv.subscription_id
      where sv.vehicle_id = vehicles.id and us.user_id = auth.uid()
    )
  );

-- A customer may edit their car's details but not its plate: on a membership
-- car the plate decides which car is covered. Staff can still change it.
create or replace function public.protect_vehicle_plate()
  returns trigger
  language plpgsql
  set search_path = public
as $$
begin
  if public.request_jwt_role() in ('anon', 'authenticated')
     and new.license_plate is distinct from old.license_plate
     and not public.is_admin() then
    raise exception 'A license plate can only be changed by the Launch Pad team.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_vehicle_plate on public.vehicles;
create trigger protect_vehicle_plate
  before update on public.vehicles
  for each row execute function public.protect_vehicle_plate();

-- -------------------------------------------------------------------------
-- VERIFY after running (each should say what is in brackets):
--   select policyname, cmd from pg_policies where schemaname = 'public'
--     and tablename in ('profiles','user_subscription','subscription_vehicles',
--                       'bookings','booking_add_ons','promo_codes','vehicles')
--     order by tablename, cmd;
--     [no users_manage_own_profile, no customer INSERT/UPDATE on
--      user_subscription, no customer INSERT on subscription_vehicles or
--      bookings, no public SELECT on promo_codes or booking_add_ons]
--   select tgname from pg_trigger where tgname in
--     ('protect_profile_privileges', 'protect_vehicle_plate');   [2 rows]
-- Then in the app: sign in as a customer and save Settings (name/phone);
-- book a cash wash; add a car; open Admin -> Promo codes and Admin -> Bookings.
-- -------------------------------------------------------------------------
