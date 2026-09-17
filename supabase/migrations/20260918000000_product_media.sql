-- Product media + storefront presentation.
-- Problem: the products page is being rebuilt as a video-led showcase, but the
-- catalog can only hold a single still image per product and there is nowhere
-- to store the brand film that opens the page. Products are also browsed on
-- one flat page -- there are no per-product URLs, so nothing about an
-- individual product can be linked, shared, or indexed by search engines.
--
-- This adds: per-product video + image gallery, a stable slug for detail
-- routes, curation fields for the featured tier, and admin-editable hero
-- fields on the existing single-row store_settings. No existing column
-- changes type and no data is destroyed, so the live checkout flow is
-- unaffected.

-- ============================================================
-- products: media, routing, curation
-- ============================================================

alter table public.products
  add column if not exists video_url   text,
  add column if not exists gallery     jsonb   not null default '[]'::jsonb,
  add column if not exists slug        text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists sort_order  integer not null default 0;

comment on column public.products.video_url is
  'Landscape (16:9) clip shown in the featured tier and on the detail page. Null falls back to image_url.';
comment on column public.products.gallery is
  'Array of additional image URLs, e.g. ["https://.../a.jpg"]. image_url remains the primary/card image.';
comment on column public.products.slug is
  'URL segment for /products/[slug]. Generated from name on insert; stable thereafter so links never rot.';
comment on column public.products.is_featured is
  'Featured tier on the products page: full-width video panel. Curated to ~3-6 regardless of catalog size.';
comment on column public.products.sort_order is
  'Manual ordering, ascending. Ties fall back to created_at desc.';

-- Backfill slugs for rows that predate this column. Collisions get a numeric
-- suffix; names with no alphanumeric characters fall back to the id prefix.
with slugged as (
  select
    id,
    coalesce(
      nullif(trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))), ''),
      'product-' || left(id::text, 8)
    ) as base,
    row_number() over (
      partition by coalesce(
        nullif(trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))), ''),
        'product-' || left(id::text, 8)
      )
      order by created_at, id
    ) as n
  from public.products
)
update public.products p
set slug = case when s.n = 1 then s.base else s.base || '-' || s.n end
from slugged s
where p.id = s.id and p.slug is null;

alter table public.products alter column slug set not null;

create unique index if not exists products_slug_idx on public.products (slug);
create index if not exists products_featured_idx
  on public.products (is_featured, sort_order) where is_active = true;

-- ============================================================
-- store_settings: hero / storefront copy
-- ============================================================
-- The hero film belongs to the storefront, not to any one product, so it
-- lives on the existing single-row config table. Admin-editable so the
-- client can run a seasonal campaign without a deploy.

alter table public.store_settings
  add column if not exists hero_video_url  text,
  add column if not exists hero_poster_url text,
  add column if not exists hero_headline   text,
  add column if not exists hero_subcopy    text,
  add column if not exists hero_cta_label  text;

comment on column public.store_settings.hero_poster_url is
  'Still shown immediately while the hero video buffers. This is the LCP element -- always set it.';

-- ============================================================
-- Storage: product-videos bucket (public read, admin-only write)
-- ============================================================
-- Separate from product-images so the size ceiling and mime allowlist are
-- enforced by Postgres rather than only by the admin form. 25 MB leaves room
-- for the hero film while still rejecting an unencoded camera export.
--
-- The admin check uses public.is_admin() (SECURITY DEFINER, added in
-- 20260611010000_rls_tighten.sql) rather than an inline subquery on profiles.
-- An inline `select ... from public.profiles` inside a policy is itself subject
-- to the profiles RLS policies, so it silently returns no rows whenever those
-- change -- and the only symptom is "new row violates row-level security" on
-- upload. is_admin() runs as the function owner and sidesteps that entirely.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-videos',
  'product-videos',
  true,
  26214400,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload product videos" on storage.objects;
create policy "Admins can upload product videos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-videos' and public.is_admin()
  );

drop policy if exists "Admins can update product videos" on storage.objects;
create policy "Admins can update product videos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-videos' and public.is_admin()
  );

drop policy if exists "Admins can delete product videos" on storage.objects;
create policy "Admins can delete product videos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-videos' and public.is_admin()
  );
