-- Add explicit is_primary tracking to subscription_vehicles.
--
-- Problem: "primary vehicle" was inferred everywhere as "the row with the
-- smallest id when ordered ascending" — fragile (id is a UUID, not
-- guaranteed to sort by insertion order) and unable to represent "the user
-- explicitly chose vehicle X as the new primary" (needed for the
-- primary-vehicle swap feature). This migration makes primary status
-- explicit and enforces exactly one primary per subscription.

alter table public.subscription_vehicles
  add column is_primary boolean not null default false;

-- Backfill: earliest vehicle per subscription (by created_at) becomes primary.
with ranked as (
  select id,
         row_number() over (partition by subscription_id order by created_at asc) as rn
  from public.subscription_vehicles
)
update public.subscription_vehicles sv
set is_primary = true
from ranked
where ranked.id = sv.id and ranked.rn = 1;

-- Enforce at most one primary per subscription.
create unique index subscription_vehicles_one_primary_per_sub
  on public.subscription_vehicles (subscription_id)
  where is_primary;
