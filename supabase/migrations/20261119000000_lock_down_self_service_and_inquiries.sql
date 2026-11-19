-- Second database lockdown, from the 2026-11-19 review of the tables the
-- 2026-11-18 migration did not cover (live pg_policies checked first).
--
-- Before this migration:
--   * a self-service member could insert, update or delete the cars on their
--     own self-service membership through the public API: more cars without
--     paying, or swapping the covered car past the 6-month vehicle lock;
--   * anyone, even signed out, could insert fleet inquiries with any user_id
--     or status, skipping the route's sign-in, field limits and 3-a-day cap;
--   * anyone could read every review (user_id, booking_id and comment);
--   * nothing stopped two reviews for the same booking.
--
-- All writes these policies covered are done by the server with the service
-- role (the Stripe webhook and /api/admin/fleet-inquiry), which RLS does not
-- apply to, so the app keeps working. No code change is needed: this can be
-- run as soon as it is merged, in Supabase -> SQL Editor.
-- Every statement is safe to run twice.

-- =========================================================================
-- 1. Self-service membership cars: customers read their own; only the
--    server (and staff) change them.
-- =========================================================================
drop policy if exists "Users can insert their own vehicles" on public.self_service_subscription_vehicles;
drop policy if exists "Users can update their own vehicles" on public.self_service_subscription_vehicles;
drop policy if exists "Users can delete their own vehicles" on public.self_service_subscription_vehicles;
-- ("Users can select their own vehicles" and the three admin policies stay.)

-- =========================================================================
-- 2. Fleet inquiries: submitted through /api/admin/fleet-inquiry only.
-- =========================================================================
drop policy if exists "Anyone can submit inquiries" on public.fleet_inquiries;
-- (Own-row read and the admin read and update policies stay.)

-- =========================================================================
-- 3. Reviews: customers read their own, staff read all. One per booking.
-- =========================================================================
drop policy if exists "Anyone can read reviews" on public.reviews;
drop policy if exists "Users read own reviews" on public.reviews;
create policy "Users read own reviews" on public.reviews
  for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Admins read reviews" on public.reviews;
create policy "Admins read reviews" on public.reviews
  for select to authenticated
  using (public.is_admin());
-- ("Users can insert their own reviews" -- own completed booking only -- stays.)

-- Fails if a booking already has two reviews (0 on 2026-11-19). The unique
-- index also serves the booking_id lookups, so the plain one is dropped.
create unique index if not exists reviews_booking_id_key on public.reviews (booking_id);
drop index if exists public.reviews_booking_id_idx;
