-- Make "is this a commercial plan?" an explicit, stored fact.
--
-- Problem: commercial plans were only ever identified by a substring match on
-- the plan's display name (`name ilike '%commercial%'`), scattered across
-- pricing display, booking coverage, and the cart. Nothing was persisted — the
-- admin "Commercial Vehicle Plan" checkbox was a local form helper that nudged
-- the price field and was thrown away on save.
--
-- That made billing depend on a display string: renaming "Commercial Wash" to
-- "Fleet Wash" would silently change what customers are charged. Commercial
-- plans must bill additional (flock) vehicles at full price with no 35%
-- family discount, so this flag now drives money and cannot live in a name.

alter table public.subscription_plans
  add column is_commercial boolean not null default false;

-- Backfill from the naming convention the code has been matching on so far.
update public.subscription_plans
set is_commercial = true
where name ilike '%commercial%';

comment on column public.subscription_plans.is_commercial is
  'Commercial vehicle plan (tow trucks, 8/9 ft bed trucks, sprinter vans). Additional vehicles on these plans bill at the full plan price — the 35% family/flock discount does not apply.';
