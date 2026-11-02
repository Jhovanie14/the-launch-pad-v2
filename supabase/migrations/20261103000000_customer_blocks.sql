-- Customers the business has decided not to serve again (terms §2.3: we may
-- refuse service to any person or vehicle for any lawful reason).
--
-- A block is a list of identifiers — an email and/or license plates — not a
-- flag on one account, so it also stops a NEW account made with the same
-- email or the same car. Staff add and remove blocks from /admin/users
-- (POST /api/admin/customer-blocks, .../unblock); a reason is required.
--
-- Where a block is enforced:
--   * sign-up           — public.hook_block_signups (Supabase "Before User
--                         Created" auth hook; enable it in the dashboard, see
--                         below). Runs inside Supabase Auth, so it can't be
--                         skipped by calling the auth API directly.
--   * membership checkout and add-vehicle — lib/customers/customerBlocks.ts,
--                         via public.find_customer_block.
--
-- Matching is done here, once, so the hook and the app agree:
--   email  — lower-cased, "+tag" dropped, and dots ignored for Gmail
--            (j.doe+1@gmail.com matches jdoe@gmail.com)
--   plate  — upper-cased, spaces and punctuation dropped (ABC 1234 = ABC-1234)
--
-- user_id is who the block was made for (to unblock them later); ON DELETE
-- SET NULL keeps the block if that account is deleted, since the point is to
-- outlive it.
--
-- AFTER APPLYING, enable the hook:
--   Dashboard → Authentication → Hooks → "Before User Created" → Postgres
--   → schema public → function hook_block_signups → Enable.
--
-- VERIFY:
--   insert into public.customer_blocks (kind, value, reason)
--     values ('email', 'blocked.test+x@gmail.com', 'migration check');
--   select * from public.find_customer_block('BlockedTest@gmail.com', '{}');  -- 1 row
--   select public.hook_block_signups('{"user":{"email":"blockedtest@gmail.com"}}'); -- error
--   delete from public.customer_blocks where reason = 'migration check';

create or replace function public.normalize_block_email(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text := lower(trim(coalesce(p_email, '')));
  local_part text;
  email_domain text;
begin
  if position('@' in cleaned) = 0 then
    return nullif(cleaned, '');
  end if;

  local_part := split_part(split_part(cleaned, '@', 1), '+', 1);
  email_domain := split_part(cleaned, '@', 2);

  if email_domain in ('gmail.com', 'googlemail.com') then
    return replace(local_part, '.', '') || '@gmail.com';
  end if;
  return local_part || '@' || email_domain;
end;
$$;

create or replace function public.normalize_block_plate(p_plate text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

create table if not exists public.customer_blocks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('email', 'license_plate')),
  value text not null check (length(trim(value)) > 0),
  normalized text generated always as (
    case kind
      when 'email' then public.normalize_block_email(value)
      else public.normalize_block_plate(value)
    end
  ) stored,
  user_id uuid references auth.users (id) on delete set null,
  admin_id uuid references auth.users (id) on delete set null,
  reason text not null check (length(trim(reason)) > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists customer_blocks_kind_normalized_key
  on public.customer_blocks (kind, normalized);
create index if not exists customer_blocks_user_id_idx
  on public.customer_blocks (user_id);

alter table public.customer_blocks enable row level security;

-- Admins read (the /admin/users badges). Writes go through the service role.
drop policy if exists "Admins can read customer blocks" on public.customer_blocks;
create policy "Admins can read customer blocks" on public.customer_blocks
  for select to authenticated
  using (public.is_admin());

-- The first block matching this email or any of these plates, if one exists.
create or replace function public.find_customer_block(p_email text, p_plates text[])
returns table (kind text, value text)
language sql
stable
set search_path = ''
as $$
  select b.kind, b.value
  from public.customer_blocks b
  where (b.kind = 'email' and b.normalized = public.normalize_block_email(p_email))
     or (b.kind = 'license_plate' and b.normalized in (
           select public.normalize_block_plate(p) from unnest(coalesce(p_plates, '{}'::text[])) as t(p)
         ))
  limit 1
$$;

revoke execute on function public.find_customer_block(text, text[]) from public, anon, authenticated;
grant execute on function public.find_customer_block(text, text[]) to service_role;

-- Supabase "Before User Created" hook: refuse sign-ups with a blocked email.
create or replace function public.hook_block_signups(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.customer_blocks b
    where b.kind = 'email'
      and b.normalized = public.normalize_block_email(event -> 'user' ->> 'email')
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Sign-ups with this email are not available. Please contact us if you have questions.'
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_block_signups(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_block_signups(jsonb) from authenticated, anon, public;

grant select on table public.customer_blocks to supabase_auth_admin;
drop policy if exists "Auth hook can read customer blocks" on public.customer_blocks;
create policy "Auth hook can read customer blocks" on public.customer_blocks
  for select to supabase_auth_admin
  using (true);
