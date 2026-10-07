-- Blog: templated, SEO-led posts + editorial categories.
--
-- Problem: posts were a single plain-text field with no search metadata, the
-- public listing read every row through the anon key (drafts included), and
-- the admin wrote from the browser under policies that were created in the
-- dashboard and are not recorded here.
--
-- This adds the template columns (body/faq/cta as jsonb), search metadata,
-- categories, and a first-publication date that locks the slug. Existing
-- posts are converted in place and stay live. The legacy `content` column is
-- kept, unread, as a safety net.
--
-- DEPLOY: run this, then deploy the blog code straight after. In between, the
-- old public pages still work, but the old admin cannot save (its browser
-- writes lose their policies below).
--
-- PRE-CHECK (must return no rows, or the unique index below fails):
--   select slug, count(*) from public.blog_posts group by slug having count(*) > 1;

-- ============================================================ categories
create table if not exists public.blog_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.blog_categories.slug is
  'Public URL /blog/category/[slug]. Fixed once created; name and description stay editable.';

create index if not exists blog_categories_sort_idx
  on public.blog_categories (sort_order, name);

-- ============================================================ posts: columns
alter table public.blog_posts
  add column if not exists seo_title        text,
  add column if not exists meta_description text,
  add column if not exists focus_keyword    text,
  add column if not exists cover_image_alt  text,
  add column if not exists category_id      uuid references public.blog_categories (id),
  add column if not exists body             jsonb not null default '{"intro":"","sections":[]}'::jsonb,
  add column if not exists faq              jsonb not null default '[]'::jsonb,
  add column if not exists cta              jsonb,
  add column if not exists published_at     timestamptz;

comment on column public.blog_posts.body is
  '{ intro, sections: [{ heading, content: RichDoc }] }. Normalised on save and again on render (lib/blog).';
comment on column public.blog_posts.cta is
  '{ destination: booking|membership|self-service|products|contact|null, buttonText }.';
comment on column public.blog_posts.published_at is
  'FIRST publication. Survives an unpublish; once set, the slug is permanent.';
comment on column public.blog_posts.content is
  'Legacy plain-text body, converted into `body` by 20261007000000_blog_seo.sql. No longer read or written.';

update public.blog_posts set published = false where published is null;
alter table public.blog_posts
  alter column published set default false,
  alter column published set not null;

update public.blog_posts set author = 'The Launch Pad' where author is null or btrim(author) = '';
alter table public.blog_posts
  alter column author set default 'The Launch Pad',
  alter column author set not null;

update public.blog_posts set created_at = now() where created_at is null;
update public.blog_posts set updated_at = created_at where updated_at is null;
alter table public.blog_posts
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

-- Existing live posts: first published when they were created.
update public.blog_posts set published_at = created_at
where published and published_at is null;

alter table public.blog_posts drop constraint if exists blog_posts_published_has_date;
alter table public.blog_posts add constraint blog_posts_published_has_date
  check (not published or published_at is not null);

create unique index if not exists blog_posts_slug_unique_idx on public.blog_posts (slug);
create index if not exists blog_posts_published_idx on public.blog_posts (published, published_at desc);
create index if not exists blog_posts_category_idx on public.blog_posts (category_id);

-- ============================================================ posts: backfill
-- Plain-text content → template. Mirrors legacyContentToBody() in
-- lib/blog/post.ts: split on blank lines, fold single newlines to spaces,
-- first paragraph is the intro, the rest is one section with no heading.
-- Only touches rows whose body is still the empty default, so re-running is
-- harmless.
with chunks as (
  select p.id, x.ord,
         btrim(regexp_replace(x.chunk, '\s*\n\s*', ' ', 'g'), E' \t\n') as para
  from public.blog_posts p
  cross join lateral regexp_split_to_table(
    regexp_replace(coalesce(p.content, ''), E'\r\n?', E'\n', 'g'),
    E'\n\\s*\n'
  ) with ordinality as x (chunk, ord)
  where p.body = '{"intro":"","sections":[]}'::jsonb
    and btrim(coalesce(p.content, '')) <> ''
),
numbered as (
  select id, para, row_number() over (partition by id order by ord) as n
  from chunks
  where para <> ''
),
built as (
  select id,
         left(max(para) filter (where n = 1), 3000) as intro,
         jsonb_agg(
           jsonb_build_object(
             'type', 'paragraph',
             'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', para))
           ) order by n
         ) filter (where n > 1) as rest
  from numbered
  group by id
)
update public.blog_posts p
set body = jsonb_build_object(
  'intro', b.intro,
  'sections', case
    when b.rest is null then '[]'::jsonb
    else jsonb_build_array(jsonb_build_object(
      'heading', '',
      'content', jsonb_build_object('type', 'doc', 'content', b.rest)
    ))
  end
)
from built b
where p.id = b.id;

-- ============================================================ RLS
-- The existing blog_posts policies were created in the dashboard; their names
-- are unknown, so drop whatever is there. After this the ONLY access through
-- the anon/user keys is reading published posts. Every write goes through a
-- server action that checks requireAdmin and uses the service role.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'blog_posts'
  loop
    execute format('drop policy %I on public.blog_posts', pol.policyname);
  end loop;
end;
$$;

alter table public.blog_posts enable row level security;

drop policy if exists "Anyone can read published posts" on public.blog_posts;
create policy "Anyone can read published posts" on public.blog_posts
  for select to anon, authenticated
  using (published = true);

alter table public.blog_categories enable row level security;

drop policy if exists "Anyone can read blog categories" on public.blog_categories;
create policy "Anyone can read blog categories" on public.blog_categories
  for select to anon, authenticated
  using (true);

-- ============================================================ storage
-- Covers are uploaded on a signed URL minted by the service role, so they do
-- not depend on storage policies. The bucket limits are the real enforcement:
-- a signed upload URL pins neither type nor size.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
