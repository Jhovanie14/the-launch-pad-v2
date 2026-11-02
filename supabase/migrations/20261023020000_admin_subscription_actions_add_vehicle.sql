-- Staff can now add a vehicle to a customer's subscription
-- (POST /api/admin/subscriptions/add-vehicle), so the audit trail accepts
-- 'add_vehicle' alongside the existing actions.
--
-- The constraint name is Postgres' default for the inline check in
-- 20261023000000_admin_subscription_actions.sql.
--
-- VERIFY after applying: add a test vehicle from /admin/users, then
--   select action, license_plate, reason from public.admin_subscription_actions
--   order by created_at desc limit 1;   -- → add_vehicle

alter table public.admin_subscription_actions
  drop constraint if exists admin_subscription_actions_action_check;

alter table public.admin_subscription_actions
  add constraint admin_subscription_actions_action_check
  check (action in ('add_vehicle', 'remove_vehicle', 'promote_and_remove_primary', 'cancel_subscription'));
