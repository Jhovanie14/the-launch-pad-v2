-- Zelle at the counter and pickup instructions.
-- Spec: docs/superpowers/specs/2026-11-25-zelle-pickup-note-design.md
--
-- 1. Staff can record a pay-at-store order as paid by Zelle.
-- 2. An optional owner-editable pickup note ("Ask for Armando…") shown to
--    customers under the pickup hours. Null means not set, so nothing shows.

alter table public.product_orders
  drop constraint if exists product_orders_paid_via_check;

alter table public.product_orders
  add constraint product_orders_paid_via_check
    check (paid_via in ('stripe', 'cash', 'card_reader', 'counter_qr', 'zelle'));

alter table public.store_settings
  add column if not exists pickup_note text;

alter table public.store_settings
  drop constraint if exists store_settings_pickup_note_length;

alter table public.store_settings
  add constraint store_settings_pickup_note_length
    check (pickup_note is null or char_length(pickup_note) <= 200);

comment on column public.store_settings.pickup_note is
  'Optional pickup instructions shown under the pickup hours (cart, pickup pass, emails). Null hides it.';

notify pgrst, 'reload schema';
