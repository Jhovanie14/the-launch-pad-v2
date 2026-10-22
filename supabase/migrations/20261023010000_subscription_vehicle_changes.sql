-- History of vehicles joining and leaving express subscriptions, for the
-- "one vehicle change per 6 months" rule (lib/subscriptions/vehicleChangeLimit.ts).
--
-- subscription_vehicles rows are deleted when a vehicle leaves, so they can't
-- answer "when did this customer last swap a car?". This append-only log can.
--
--   added    — a vehicle joined after checkout (add-vehicle)
--   removed  — a vehicle left (remove, primary swap, admin unsubscribe)
--   unlocked — staff lifted the lock early; earlier events stop counting
--
-- Written only by the service role. Customers can read their own rows (the
-- billing page shows when their next change is available); admins read all.
--
-- Customers with no rows are unlocked, so existing subscribers start fresh.
--
-- VERIFY after applying: remove a family vehicle and add a different one as a
-- test customer, then try adding another — it should be refused with the
-- unlock date, and /dashboard/billing should show the same date.

create table if not exists public.subscription_vehicle_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('added', 'removed', 'unlocked')),
  license_plate text,
  actor text not null check (actor in ('customer', 'admin')),
  admin_id uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists subscription_vehicle_changes_user_id_idx
  on public.subscription_vehicle_changes (user_id, created_at desc);

alter table public.subscription_vehicle_changes enable row level security;

drop policy if exists "Users read own vehicle changes" on public.subscription_vehicle_changes;
create policy "Users read own vehicle changes" on public.subscription_vehicle_changes
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
