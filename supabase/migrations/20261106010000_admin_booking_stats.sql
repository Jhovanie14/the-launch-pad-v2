-- Summary numbers for the admin bookings page, computed in the database
-- instead of downloading every booking to the browser to count and sum them.
--
-- SECURITY INVOKER: runs with the caller's own row-level security, so an
-- admin (who can read every booking) gets the business totals and anyone
-- else only ever counts the rows they could already see.
--
-- p_today is passed in by the page as the Houston calendar date, so "today"
-- matches the business day, not the database server's UTC day.

create or replace function public.admin_booking_stats(p_today date)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'total', count(*),
    'today', count(*) filter (where appointment_date::date = p_today),
    'revenue', coalesce(
      sum(total_price::numeric) filter (where status in ('completed', 'confirmed')),
      0
    )
  )
  from public.bookings;
$$;

revoke all on function public.admin_booking_stats(date) from public, anon;
grant execute on function public.admin_booking_stats(date) to authenticated;
