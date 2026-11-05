-- Indexes for the columns the app filters and sorts on most.
--
-- The base tables predate the migrations folder, so the repo cannot show
-- which of these already exist. Every statement is IF NOT EXISTS, so running
-- it twice is safe; an equivalent index under another name would just mean a
-- redundant (harmless) copy, which can be dropped later.
--
-- Columns come from a tally of the app's own queries (.eq / .in / .order /
-- .gte), plus the row-level-security policies that filter on user_id.
-- Composite indexes put the equality column first and the sort column second,
-- so "this customer's rows, newest first" is one index range scan.
--
-- Tables are still small, so plain CREATE INDEX (which briefly blocks writes)
-- is fine inside the migration transaction. On a large table you would run
-- CREATE INDEX CONCURRENTLY by hand instead.

-- Bookings: customer history, admin lists by status/date, Stripe webhook lookups.
create index if not exists bookings_user_id_created_at_idx
  on public.bookings (user_id, created_at desc);
create index if not exists bookings_status_created_at_idx
  on public.bookings (status, created_at desc);
create index if not exists bookings_appointment_idx
  on public.bookings (appointment_date, appointment_time);
create index if not exists bookings_payment_intent_id_idx
  on public.bookings (payment_intent_id);

create index if not exists booking_add_ons_booking_id_idx
  on public.booking_add_ons (booking_id);
create index if not exists booking_add_ons_created_at_idx
  on public.booking_add_ons (created_at);

-- Self-service bay visits.
create index if not exists self_service_usage_logs_user_id_check_in_idx
  on public.self_service_usage_logs (user_id, check_in_time desc);
create index if not exists self_service_usage_logs_check_in_idx
  on public.self_service_usage_logs (check_in_time desc);
create index if not exists self_service_usage_logs_subscription_id_idx
  on public.self_service_usage_logs (subscription_id);

-- Memberships: "this customer's active plan" runs on nearly every page.
create index if not exists user_subscription_user_id_status_idx
  on public.user_subscription (user_id, status);
create index if not exists user_subscription_status_idx
  on public.user_subscription (status);
create index if not exists user_subscription_stripe_subscription_id_idx
  on public.user_subscription (stripe_subscription_id);

create index if not exists self_service_subscriptions_user_id_status_idx
  on public.self_service_subscriptions (user_id, status);
create index if not exists self_service_subscriptions_stripe_subscription_id_idx
  on public.self_service_subscriptions (stripe_subscription_id);

create index if not exists subscription_vehicles_subscription_id_idx
  on public.subscription_vehicles (subscription_id);
create index if not exists subscription_vehicles_vehicle_id_idx
  on public.subscription_vehicles (vehicle_id);

create index if not exists self_service_subscription_vehicles_subscription_id_idx
  on public.self_service_subscription_vehicles (subscription_id);
create index if not exists self_service_subscription_vehicles_vehicle_id_idx
  on public.self_service_subscription_vehicles (vehicle_id);

-- Vehicles: a customer's garage, and staff looking a car up by plate.
create index if not exists vehicles_user_id_idx
  on public.vehicles (user_id);
create index if not exists vehicles_license_plate_idx
  on public.vehicles (license_plate);

-- Reviews: "has this booking been reviewed?"
create index if not exists reviews_user_id_booking_id_idx
  on public.reviews (user_id, booking_id);
create index if not exists reviews_booking_id_idx
  on public.reviews (booking_id);

-- Admin lists.
create index if not exists contacts_status_created_at_idx
  on public.contacts (status, created_at desc);
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);
create index if not exists profiles_role_idx
  on public.profiles (role);
create index if not exists profiles_email_idx
  on public.profiles (email);
create index if not exists product_orders_created_at_idx
  on public.product_orders (created_at desc);
