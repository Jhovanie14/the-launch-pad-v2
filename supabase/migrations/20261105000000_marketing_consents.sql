-- Marketing email consent: who agreed to product news and offers, when, and
-- how. This is the consent evidence UK PECR / UK GDPR expect us to keep, and
-- the source of truth that the Resend "Product news & offers" topic mirrors.
--
-- One row per person, keyed by the normalized email (same normalization as
-- customer_blocks), because guests who book without an account have no
-- profile. user_id is filled in when the email belongs to an account.
--
-- Written only by lib/marketing/consent.ts (recordConsent). Unticked
-- checkboxes never write here, so they can never unsubscribe anyone.
-- Service-role only: RLS is on with no policies.

create table if not exists public.marketing_consents (
  id uuid primary key default gen_random_uuid(),
  email text not null check (position('@' in email) > 1),
  normalized_email text generated always as (public.normalize_block_email(email)) stored,
  user_id uuid references auth.users (id) on delete set null,
  status text not null check (status in ('subscribed', 'unsubscribed')),
  source text not null check (source in (
    'signup', 'booking', 'settings', 'resend_unsubscribe', 'resend_preferences', 'block'
  )),
  subscribed_at timestamptz,
  unsubscribed_at timestamptz,
  resend_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.marketing_consents.source is
  'What caused the latest change: signup (after email confirmation), booking (guest, after payment), settings, resend_unsubscribe, resend_preferences, block.';
comment on column public.marketing_consents.resend_synced_at is
  'Null while the latest change has not reached Resend; the daily /api/cron/marketing-sync retries these.';

create unique index if not exists marketing_consents_normalized_email_key
  on public.marketing_consents (normalized_email);
create index if not exists marketing_consents_user_id_idx
  on public.marketing_consents (user_id);
create index if not exists marketing_consents_unsynced_idx
  on public.marketing_consents (updated_at) where resend_synced_at is null;

alter table public.marketing_consents enable row level security;

-- getConsentStatus normalizes lookups through the same function.
grant execute on function public.normalize_block_email(text) to service_role;
