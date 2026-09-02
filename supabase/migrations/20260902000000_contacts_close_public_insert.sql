-- =========================================================================
-- contacts: remove the public INSERT grant.
--
-- 20260611010000_rls_tighten.sql fixed the world-readable SELECT on this
-- table but deliberately left the INSERT alone, because the contact form was
-- writing with the anon key and would have broken.
--
-- That grant means the form is not the only way in. The anon key is public --
-- it ships inside every page's JavaScript -- so anyone can POST straight at
-- /rest/v1/contacts and drop rows into the admin inbox without ever loading
-- the site. Verified against production: an anonymous insert failed on a
-- NOT NULL constraint (23502), not on a policy denial (42501), so RLS was
-- letting the write through.
--
-- Any spam protection on /api/contact is decoration while that stands, so the
-- route now writes with the service role (which bypasses RLS) and the public
-- grant goes away. No INSERT policy replaces it: nothing else writes here.
--
-- ORDERING: deploy the application first. This migration and the route change
-- must land together, and if the migration goes first the live form breaks --
-- the old code would still be presenting an anon key that no longer has
-- permission.
--
-- VERIFY afterwards: an anon POST to /rest/v1/contacts returns 42501, and the
-- contact form on /contact still submits successfully.
-- =========================================================================

alter table public.contacts enable row level security;

-- Dropped by lookup rather than by name: the grant was created in the
-- dashboard, so its name is not recorded anywhere in this repo.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contacts'
      and cmd = 'INSERT'
  loop
    raise notice 'dropping INSERT policy on public.contacts: %', pol.policyname;
    execute format('drop policy %I on public.contacts', pol.policyname);
  end loop;
end $$;
