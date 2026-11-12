-- Automatic marketing emails (win-back, ...) are sent one by one, so they
-- carry our own signed unsubscribe link instead of Resend's. Unsubscribes
-- made through it are recorded with source 'email_link'.
--
-- Apply BEFORE setting MARKETING_UNSUBSCRIBE_SECRET: until that secret is set
-- the win-back cron sends nothing, so no link can point at the new source early.

alter table public.marketing_consents
  drop constraint if exists marketing_consents_source_check;

alter table public.marketing_consents
  add constraint marketing_consents_source_check check (source in (
    'signup', 'booking', 'settings', 'resend_unsubscribe', 'resend_preferences', 'block', 'email_link'
  ));

comment on column public.marketing_consents.source is
  'What caused the latest change: signup (after email confirmation), booking (guest, after payment), settings, resend_unsubscribe, resend_preferences, block, email_link (unsubscribe link in an automatic email).';
