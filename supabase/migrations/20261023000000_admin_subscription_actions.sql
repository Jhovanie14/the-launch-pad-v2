-- Audit trail for admin-assisted unsubscribes.
--
-- Staff can now unsubscribe a vehicle or cancel a whole subscription on a
-- customer's behalf (POST /api/admin/subscriptions/unsubscribe). Every such
-- change records who did it, for which customer, what changed, and the
-- customer's reason — the evidence we need if a customer later disputes a
-- charge or says they never asked.
--
-- Rows are written only by the service role (which bypasses RLS) after the
-- Stripe change succeeds. Admins can read them; nobody can edit or delete
-- them through the API.
--
-- user_id / admin_id use ON DELETE SET NULL so the trail outlives deleted
-- accounts. subscription_vehicle_id has no FK: that row is deleted by the
-- very action being recorded.
--
-- VERIFY after applying: unsubscribe a test vehicle from /admin/users, then
--   select * from public.admin_subscription_actions order by created_at desc limit 5;

create table if not exists public.admin_subscription_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  action text not null
    check (action in ('remove_vehicle', 'promote_and_remove_primary', 'cancel_subscription')),
  product text not null check (product in ('express', 'self_service')),
  stripe_subscription_id text not null,
  subscription_vehicle_id text,
  license_plate text,
  reason text not null check (length(trim(reason)) > 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_subscription_actions_user_id_idx
  on public.admin_subscription_actions (user_id, created_at desc);

alter table public.admin_subscription_actions enable row level security;

drop policy if exists "Admins can read subscription actions" on public.admin_subscription_actions;
create policy "Admins can read subscription actions" on public.admin_subscription_actions
  for select to authenticated
  using (public.is_admin());
