-- Blog: stop the dashboard's updated_at trigger, and undo what it did.
--
-- Problem: blog_posts carries an updated_at trigger created in the dashboard
-- (not recorded in this repo). When 20261007000000_blog_seo.sql converted
-- every post, the trigger stamped them all "updated 2026-10-07" — so every
-- post shows a false "Updated" date, and the sitemap and Article JSON-LD
-- report it as the last modification.
--
-- The trigger also defeats the editor: app/actions/blog.ts sets updated_at
-- itself on every save, and deliberately does NOT on unpublish (the editor is
-- keyed on updated_at; bumping it there discards unsaved edits). With the
-- trigger in place, every write bumps it anyway.
--
-- Safe to re-run.

-- Drop only triggers that maintain a timestamp: moddatetime, or a function
-- whose name or body mentions updated_at. Anything else is left in place.
do $$
declare t record;
begin
  for t in
    select tg.tgname
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    where tg.tgrelid = 'public.blog_posts'::regclass
      and not tg.tgisinternal
      and (p.proname = 'moddatetime' or p.proname ilike '%updated%' or p.prosrc ilike '%updated_at%')
  loop
    execute format('drop trigger %I on public.blog_posts', t.tgname);
    raise notice 'dropped trigger %', t.tgname;
  end loop;
end;
$$;

-- The original edit dates were overwritten and cannot be recovered; the
-- first publication date is the honest replacement. Only rows stamped on
-- 7–8 Oct 2026 (UTC) are touched — the migration window, during which the
-- old admin could not save, so no genuine edit is overwritten.
update public.blog_posts
set updated_at = coalesce(published_at, created_at)
where updated_at >= timestamptz '2026-10-07 00:00:00+00'
  and updated_at <  timestamptz '2026-10-09 00:00:00+00';
