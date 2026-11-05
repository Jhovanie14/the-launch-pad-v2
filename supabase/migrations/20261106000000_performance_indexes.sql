-- Indexes for the columns the app filters and sorts on most.
--
-- The base tables predate the migrations folder, so the repo can't show the
-- exact columns of every table. Each index is therefore created only if its
-- table and all of its columns exist; anything skipped is listed in a NOTICE
-- ("skipped index …"). Every index is IF NOT EXISTS, so running this again
-- is safe.
--
-- Columns come from a tally of the app's own queries (.eq / .in / .order /
-- .gte), plus the row-level-security policies that filter on user_id.
-- Composite indexes put the equality column first and the sort column second,
-- so "this customer's rows, newest first" is one index range scan.
--
-- Tables are still small, so plain CREATE INDEX (which briefly blocks writes)
-- is fine. On a large table you would run CREATE INDEX CONCURRENTLY by hand.

do $$
declare
  spec record;
  missing text;
begin
  for spec in
    select * from (values
      -- Bookings: customer history, admin lists by status/date, Stripe webhook lookups.
      ('bookings_user_id_created_at_idx',      'bookings',            array['user_id','created_at'],        '(user_id, created_at desc)'),
      ('bookings_status_created_at_idx',       'bookings',            array['status','created_at'],         '(status, created_at desc)'),
      ('bookings_appointment_idx',             'bookings',            array['appointment_date','appointment_time'], '(appointment_date, appointment_time)'),
      ('bookings_payment_intent_id_idx',       'bookings',            array['payment_intent_id'],           '(payment_intent_id)'),
      ('bookings_vehicle_id_idx',              'bookings',            array['vehicle_id'],                  '(vehicle_id)'),
      ('booking_add_ons_booking_id_idx',       'booking_add_ons',     array['booking_id'],                  '(booking_id)'),
      ('booking_add_ons_created_at_idx',       'booking_add_ons',     array['created_at'],                  '(created_at)'),

      -- Self-service bay visits.
      ('self_service_usage_logs_user_id_check_in_idx', 'self_service_usage_logs', array['user_id','check_in_time'], '(user_id, check_in_time desc)'),
      ('self_service_usage_logs_check_in_idx',         'self_service_usage_logs', array['check_in_time'],           '(check_in_time desc)'),
      ('self_service_usage_logs_subscription_id_idx',  'self_service_usage_logs', array['subscription_id'],         '(subscription_id)'),

      -- Memberships: "this customer's active plan" runs on nearly every page.
      ('user_subscription_user_id_status_idx',            'user_subscription',          array['user_id','status'],        '(user_id, status)'),
      ('user_subscription_status_idx',                    'user_subscription',          array['status'],                  '(status)'),
      ('user_subscription_stripe_subscription_id_idx',    'user_subscription',          array['stripe_subscription_id'],  '(stripe_subscription_id)'),
      ('self_service_subscriptions_user_id_status_idx',   'self_service_subscriptions', array['user_id','status'],        '(user_id, status)'),
      ('self_service_subscriptions_stripe_sub_id_idx',    'self_service_subscriptions', array['stripe_subscription_id'],  '(stripe_subscription_id)'),
      ('subscription_vehicles_subscription_id_idx',       'subscription_vehicles',      array['subscription_id'],         '(subscription_id)'),
      ('subscription_vehicles_vehicle_id_idx',            'subscription_vehicles',      array['vehicle_id'],              '(vehicle_id)'),
      ('self_service_subscription_vehicles_sub_id_idx',   'self_service_subscription_vehicles', array['subscription_id'], '(subscription_id)'),
      ('self_service_subscription_vehicles_vehicle_idx',  'self_service_subscription_vehicles', array['vehicle_id'],      '(vehicle_id)'),

      -- Vehicles: a customer's garage, and staff looking a car up by plate.
      ('vehicles_user_id_idx',                 'vehicles',            array['user_id'],                     '(user_id)'),
      ('vehicles_license_plate_idx',           'vehicles',            array['license_plate'],               '(license_plate)'),

      -- Reviews: "has this booking been reviewed?"
      ('reviews_user_id_booking_id_idx',       'reviews',             array['user_id','booking_id'],        '(user_id, booking_id)'),
      ('reviews_booking_id_idx',               'reviews',             array['booking_id'],                  '(booking_id)'),

      -- Admin lists.
      ('contacts_status_created_at_idx',       'contacts',            array['status','created_at'],         '(status, created_at desc)'),
      ('profiles_created_at_idx',              'profiles',            array['created_at'],                  '(created_at desc)'),
      ('profiles_role_idx',                    'profiles',            array['role'],                        '(role)'),
      ('profiles_email_idx',                   'profiles',            array['email'],                       '(email)'),
      ('product_orders_created_at_idx',        'product_orders',      array['created_at'],                  '(created_at desc)')
    ) as t(index_name, table_name, cols, definition)
  loop
    select string_agg(c, ', ') into missing
    from unnest(spec.cols) as c
    where not exists (
      select 1 from information_schema.columns ic
      where ic.table_schema = 'public' and ic.table_name = spec.table_name and ic.column_name = c
    );

    if missing is not null then
      raise notice 'skipped index % on %: missing column(s) %', spec.index_name, spec.table_name, missing;
    else
      execute format('create index if not exists %I on public.%I %s', spec.index_name, spec.table_name, spec.definition);
    end if;
  end loop;
end
$$;
