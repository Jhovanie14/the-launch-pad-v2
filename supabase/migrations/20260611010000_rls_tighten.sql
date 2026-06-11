-- Phase 1 RLS hardening.
--
-- Problem: RLS is ENABLED on every table, but several tables also have
-- permissive `using (true)` policies for the `public`/`anon` roles. Because
-- RLS policies are OR-combined, a single `true` policy defeats RLS entirely.
-- Since the anon key is public in the browser, anyone can read/write these
-- tables directly through the Supabase REST API.
--
-- This file is split into two sections:
--   SAFE   — high confidence these do not break any user-facing or admin flow.
--   REVIEW — may affect guest booking, public reviews, or admin reads depending
--            on whether those flows use the anon key or the service-role key.
--            Left commented out. Enable only after tracing/testing each flow.
--
-- Apply the SAFE section via Supabase Dashboard -> SQL Editor.

-- =========================================================================
-- SAFE 1 — subscription_plans: anyone could INSERT/UPDATE/DELETE plans,
-- i.e. rewrite your prices. Remove the blanket write policy. Admin writes
-- remain via "Admins manage subscription plans"; public SELECT remains.
-- =========================================================================
drop policy if exists "Allow all inserts/updates" on public.subscription_plans;

-- =========================================================================
-- SAFE 2 — contacts: the only SELECT policy is named "Admins can select all
-- contacts" but its USING clause is `true` for {public}, so every contact-form
-- submission (name, email, message) is world-readable. Replace with a real
-- admin-only SELECT. The public INSERT (contact form) is unchanged.
-- =========================================================================
drop policy if exists "Admins can select all contacts" on public.contacts;
create policy "Admins can select contacts" on public.contacts
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- =========================================================================
-- SAFE 3 — fleet_invoices: readable by any authenticated user via
-- "Enable read access for all users" (USING true). Admin SELECT remains via
-- the existing "Admin can manage invoices" (FOR ALL, role = admin) policy.
-- Fleet invoices are an admin-only feature, so no user flow depends on this.
-- =========================================================================
drop policy if exists "Enable read access for all users" on public.fleet_invoices;


-- =========================================================================
-- READY (apply after deploying commit 2f653e7) — bookings & self_service.
-- The guest booking-success pages and ensureVehicle were switched to the
-- service-role client (commit 2f653e7), so dropping the permissive bookings
-- SELECT no longer breaks guest flows. Remaining bookings readers:
--   * admin booking list / realtime / dashboard  -> covered by the admin policy below
--   * a user's own bookings list                 -> covered by existing "Users can view own bookings"
--   * guest success pages                         -> now service-role (RLS bypassed)
-- VERIFY after applying: guest success page loads, admin booking list loads,
-- a user sees only their own bookings, and an anon REST query to /bookings
-- returns zero rows.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow select all bookings" on public.bookings;
create policy "Admins can select all bookings" on public.bookings
  for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role = 'admin'));
-- ("Users can view own bookings" (auth.uid() = user_id) already exists.)

-- self_service_subscriptions: owner read ("user can view own subscriptions")
-- already exists; add admin read, then drop the permissive "allow read for all".
create policy "Admins can read self service subscriptions"
  on public.self_service_subscriptions
  for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists "allow read for all" on public.self_service_subscriptions;


-- =========================================================================
-- STILL DEFERRED (needs app changes first) — vehicles & profiles.
-- See docs/superpowers/specs/2026-06-11-rls-tightening-followup.md.
--
-- vehicles: the booking CONFIRMATION page (a client component) reads vehicles
-- by plate via the anon key for guests. That read must move server-side before
-- dropping "Vehicles are viewable by everyone", or guest vehicle display breaks.
-- ---------------------------------------------------------------------------
-- drop policy if exists "Vehicles are viewable by everyone" on public.vehicles;
-- create policy "Admins can select all vehicles" on public.vehicles
--   for select to authenticated
--   using (exists (select 1 from public.profiles p
--                  where p.id = auth.uid() and p.role = 'admin'));
-- create policy "Users can select own vehicles" on public.vehicles
--   for select to authenticated
--   using (user_id = auth.uid());
--
-- profiles: anon "Enable read access for all users" + authenticated
-- "allow_read_profiles" make all profiles world-readable. NOTE: the public
-- reviews carousel and any UI showing another user's name/avatar read profiles;
-- restricting to own+admin will break those for anon visitors. Consider a
-- public VIEW exposing only (id, full_name, avatar_url) instead of opening the
-- whole table. Do not enable without handling that.
-- ---------------------------------------------------------------------------
-- drop policy if exists "Enable read access for all users" on public.profiles;
-- drop policy if exists "allow_read_profiles" on public.profiles;
-- create policy "Admins can read all profiles" on public.profiles
--   for select to authenticated
--   using (exists (select 1 from public.profiles p
--                  where p.id = auth.uid() and p.role = 'admin'));
-- -- ("users_manage_own_profile" (auth.uid() = id) already exists.)
