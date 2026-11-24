-- A short name for the shop to show ("Utility towels, 8-pack"), so product
-- names pasted from marketplace listings don't fill the cards. Optional: the
-- shop falls back to the full name, which stays the SEO and receipt name.
-- Spec: docs/superpowers/specs/2026-11-24-catalog-redesign-design.md

alter table public.products
  add column if not exists display_name text
    check (display_name is null or char_length(display_name) <= 60);

comment on column public.products.display_name is
  'Short name shown on cards and as the product page title. Null falls back to name.';
