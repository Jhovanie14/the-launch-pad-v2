# Blog: templated, SEO-led blog and editor (ported from Aesthetic Training Hub) — Design

Date: 2026-10-07
Status: Approved for planning

## Problem

The blog exists but does little for search. `/blog` is a client component that fetches every row of `blog_posts` from the browser — **drafts included**, because `blogService.getAllPosts` never filters on `published`. Post bodies are a single plain-text field rendered with `whitespace-pre-line`; there is no SEO title, meta description, keyword, cover alt text, category, structured data, table of contents, or internal linking. The "Related Posts" section on `/blog/[slug]` is an empty placeholder. The admin is a dialog with a textarea, and writes go from the browser straight to Supabase under RLS policies that were created in the dashboard and are not recorded in this repo.

Aesthetic Training Hub (`D:\Next\aesthetic-training-hub`) has a blog built specifically to rank: a fixed post template, a constrained rich-text editor, a live SEO checklist that gates publishing, categories, JSON-LD, RSS and sitemap integration. The goal is to bring that blog to The Launch Pad, re-implemented on TLP's stack (Supabase client + service role, shadcn) and TLP's visual language, so posts can rank for Houston car-care searches and lead readers into booking.

Decisions made during brainstorming:

- **Port the behaviour, not the code.** ATH uses Drizzle and server-only DB access; TLP uses Supabase clients. The pure modules (template, rich text, slug, checklist, JSON-LD) port almost verbatim; data access, actions and UI are rewritten in TLP patterns.
- **Existing posts are converted and stay live** (option A). Each is held to the publishing checklist the next time it is saved while published.
- **CTA is a fixed list of destinations**, chosen per post, leading with booking.
- **Server actions** for writes (a post is one nested document; typed results flow straight back to the editor). **Tiptap** for section bodies (non-technical staff write the posts).
- No audit log (TLP has none).

## Current state (for reference)

- `app/(user)/blog/layout.tsx` — metadata only (title "Car Care Tips & News").
- `app/(user)/blog/page.tsx` — `"use client"`, `useBlog()`, lists all posts.
- `app/(user)/blog/[slug]/page.tsx` — server component, but uses the **browser** Supabase client; plain-text body; empty related posts.
- `app/admin/blog/page.tsx` + `components/blog-post.form.tsx` — dialog CRUD, client-side writes, cover upload to the `blog-images` bucket from the browser.
- `hooks/useBlog.ts`, `lib/services/blogService.ts` — client data layer. `BlogPost` / `BlogPostFormData` in `types/index.ts`.
- `blog_posts` columns: `id, title, slug, excerpt, content, author, cover_image, published, created_at, updated_at`. Not created by any migration in `supabase/migrations/`.
- `app/sitemap.ts` lists `/blog` only, `changeFrequency: "yearly"`.
- Patterns to follow: `requireAdmin(supabase, admin)` in `lib/auth/guards.ts`; service-role client `utils/supabase/admin.ts`; anon, cookie-free read client in `lib/products/queries.ts` (keeps pages cacheable); `lib/seo/openGraph.ts`; `public.is_admin()`; product media migration for bucket settings.

## Scope

In scope:

- Migration: `blog_categories` table; new columns + backfill on `blog_posts`; RLS reset; `blog-images` bucket settings.
- `lib/blog/*` pure modules with Vitest tests.
- `lib/blog/queries.ts` (public reads, anon) and `lib/blog/admin-queries.ts` (admin reads, service role behind `requireAdmin`).
- `app/actions/blog.ts` server actions: save/publish, unpublish, delete draft, cover upload ticket + confirm, category create/update/delete.
- Admin: `/admin/blog` list, `/admin/blog/new`, `/admin/blog/[id]` editor, `/admin/blog/categories`.
- Public: `/blog`, `/blog/category/[slug]`, `/blog/[slug]`, `/blog/preview/[id]`, `/blog/rss.xml`.
- Sitemap and robots updates; `.blog-prose` styles.
- Remove `hooks/useBlog.ts`, `lib/services/blogService.ts`, `components/blog-post.form.tsx`, and the `BlogPost`/`BlogPostFormData` types once unused.

Out of scope: audit log, scheduled publishing, author profiles, images inside the body, comments, dropping the legacy `content` column.

## Data model

Migration `supabase/migrations/20261007000000_blog_seo.sql`. Additive and idempotent; no data destroyed.

### `blog_categories` (new)

| column | type | notes |
|---|---|---|
| `id` | uuid pk default `gen_random_uuid()` | |
| `slug` | text not null unique | public URL `/blog/category/[slug]`; fixed after creation |
| `name` | text not null | editable |
| `description` | text | category page intro + meta description |
| `sort_order` | integer not null default 0 | chip order, ascending |
| `created_at`, `updated_at` | timestamptz not null default now() | |

Nothing seeded.

### `blog_posts` (extended)

New columns:

| column | type | notes |
|---|---|---|
| `seo_title` | text | `<title>`; falls back to `title` |
| `meta_description` | text | required to publish |
| `focus_keyword` | text | checklist input only |
| `cover_image_alt` | text | required to publish |
| `category_id` | uuid references `blog_categories(id)` | |
| `body` | jsonb not null default `'{"intro":"","sections":[]}'` | `{ intro: string, sections: [{ heading: string, content: RichDoc }] }` |
| `faq` | jsonb not null default `'[]'` | `[{ question, answer }]` |
| `cta` | jsonb | `{ destination, buttonText }` or null |
| `published_at` | timestamptz | FIRST publication; survives unpublish; locks the slug |

Kept: `published` (boolean) remains the sole visibility flag; `cover_image` keeps the public URL; `author` backfilled to `'The Launch Pad'` where null/blank, then `not null default 'The Launch Pad'`; `content` kept but no longer read or written.

Constraints and indexes: check `published = false OR published_at IS NOT NULL`; unique index on `slug` (`if not exists`); index `(published, published_at desc)`; index `(category_id)`; `updated_at` defaulted to now() where null.

### Backfill (existing posts stay live)

- `published_at = coalesce(created_at, now())` where `published` and `published_at is null`.
- Where `body` is still the empty default and `content` is non-empty: split `content` on blank lines (`\n\s*\n`), collapse single newlines to spaces, trim, drop empties. First paragraph → `body.intro`. Remaining paragraphs → one section `{ heading: "", content: { type: "doc", content: [paragraph…] } }`. No section if only one paragraph. Done in SQL; mirrored by `legacyContentToBody()` in TypeScript so the rule is unit-tested.

### Security

- `blog_posts`: drop **every** existing policy (loop over `pg_policies` — their names are not in the repo), enable RLS, create one policy: `select` for `anon, authenticated` using `published = true`. No insert/update/delete policies: all writes go through server actions using the service-role client after `requireAdmin`.
- `blog_categories`: RLS on; `select` for `anon, authenticated` using `true`; no write policies.
- `blog-images` bucket: `insert … on conflict do update` to `public = true`, `file_size_limit = 5242880`, `allowed_mime_types = {image/jpeg,image/png,image/webp}`. Uploads use a signed upload URL minted by the service role, so they do not depend on storage policies.

## Pure modules (`lib/blog/`)

Ported from ATH `src/lib/blog`, with TLP changes noted. Each has a `*.test.ts`.

- `rich-text.ts` — verbatim. `RichDoc` types, `safeHref` (site-relative, `#`, http(s), mailto, tel; refuses `javascript:`, `data:`, protocol-relative), `normaliseRichDoc` (allow-list rebuild: paragraph, H3 only, bullet/ordered lists, bold, italic, link, hardBreak; size/depth budgets; never throws), `renderRichDocToHtml` (normalises again, escapes everything, external links get `rel="noopener noreferrer" target="_blank"`), `richDocText`, `richDocLinks`, `countWords`.
- `slug.ts` — verbatim except `isSlugLocked` reads `published_at`. `RESERVED_SLUGS = preview, category, rss, page, feed`. `resolveSlugForSave` refuses changing a locked slug.
- `post.ts` — limits, `BlogBody`/`BlogFaq`/`BlogCta` types, `normaliseBody/Faq/Cta`, `introParagraphs`, `sectionAnchors`, `postWordCount`, `readingMinutes`, `postSummary`, `legacyContentToBody` (new). `DEFAULT_AUTHOR = "The Launch Pad"`.
- `cta.ts` (new, replaces ATH's course-category CTA):

  | destination | href | heading | default button |
  |---|---|---|---|
  | `booking` | `/service` | Book express detailing in Houston | Book express detailing |
  | `membership` | `/pricing` | Unlimited washes, one monthly price | See membership plans |
  | `self-service` | `/self-service` | Wash it yourself, 24/7 | Find the self-service bays |
  | `products` | `/products` | The products we use on every car | Shop car care products |
  | `contact` | `/contact` | Questions? Talk to the team | Get in touch |

  No destination → fallback heading "Everything under one roof", button "Book express detailing", href `/service`. `ctaFor(cta)` returns `{ href, heading, buttonText }`.
- `images.ts` — `BLOG_BUCKET = "blog-images"`, 5 MB, JPG/PNG/WebP, `validateBlogImage`, `newBlogImagePath` (`posts/<uuid>.<ext>`), `isBlogImageUrl(url)` (true only for `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/<safe path>`, which also accepts legacy `cover-images/…` URLs), `blogImageUrl(path)`.
- `seo-checklist.ts` — verbatim rules; copy adapted to TLP ("e.g. “ceramic coating houston”"; internal-link advice mentions booking/services). Required: title, valid slug, meta description, cover + alt, intro, ≥1 section with writing. Advisory: keyword in title / SEO title / first paragraph / a heading / meta / slug; SEO title ≤ 60; meta 120–158; ≥ 600 words; an internal link or a CTA; every section headed. Any CTA destination counts as an internal link.
- `json-ld.ts` — `jsonLdString` (escapes `<`, `>`, `&`), `articleJsonLd` (publisher "The Launch Pad", logo `https://www.thelaunchpadwash.com/launchpad-logo.png`, `inLanguage: "en-US"`, author Person unless it is the default author), `breadcrumbJsonLd`, `faqJsonLd` (null when empty).
- `site.ts` (small) — `SITE_URL = "https://www.thelaunchpadwash.com"` and `SITE_HOST`, used for canonical URLs, JSON-LD and internal-link detection (the same constant `app/sitemap.ts` and `robots.ts` hard-code today).

## Data access

- `lib/blog/queries.ts` — anon client with no cookies, like `lib/products/queries.ts`, so pages stay cacheable. Every function filters `published = true` (RLS enforces it as well). `publishedPostsPage({ page, categoryId })` → `{ posts, total, pageCount }` (12 per page, `count: "exact"`, ordered `published_at desc, id desc`, card columns only); `publishedPostBySlug(slug)` (React `cache`, joins category, normalises body/faq/cta on read); `relatedPosts(post, 3)` (same category first, topped up with newest); `publicCategories()` (categories with ≥1 published post, with `lastModified`); `categoryBySlug(slug)`; `rssPosts(30)`; `blogSitemapEntries()` (fail-soft: logs and returns `[]`).
- `lib/blog/admin-queries.ts` — `server-only`; each function runs `requireAdmin(await createClient(), createAdminClient())` itself, then reads with the service role: `adminPosts()`, `adminPost(id)` (any status; uuid-checked), `adminCategories()` (with post counts).

## Server actions (`app/actions/blog.ts`)

`"use server"`. Each action calls `requireAdmin`, returning `{ ok: false, error: "Not authorised" }` on `AuthError`. Writes use the service-role client.

- `saveBlogPost(input: unknown, intent: "save" | "publish")` → `{ ok: true, id, slug, published } | { ok: false, error, fieldErrors?, blockers? }`. Zod-validates scalars; `body`/`faq`/`cta` go through the normalisers; the cover must pass `isBlogImageUrl` or be null; the category must exist; `resolveSlugForSave` against the stored row. If `intent === "publish"` or the post is already live, it runs `seoChecklist` and refuses with `blockers` unless `canPublish`. `published_at` is set on first publish only, and `updated_at = now()`. A unique violation (`23505`) → "Another post already uses this web address." Then revalidates `/blog`, `/blog/[slug]`, the category page, `/admin/blog`, and `/sitemap.xml`.
- `unpublishBlogPost(id)` — sets `published = false` only where it is currently published. Slug stays locked.
- `deleteBlogPost(id)` — only where `published_at is null`; then removes the cover object best-effort if no other post uses it.
- `requestBlogImageUpload(mime, size)` → `{ ok, path, token, url }` via `createSignedUploadUrl`; `confirmBlogImageUpload(path)` re-checks the stored object's type and size with `storage.info` (removes it on failure).
- `createBlogCategory`, `updateBlogCategory` (`useActionState` form actions; slug only on create), `deleteBlogCategory(id)` (refused while posts use it).

## Admin UI

Components in `components/admin/blog/`, built from TLP shadcn primitives (`Card`, `Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Label`), with blue-900 primary actions as elsewhere in the admin.

- `/admin/blog` (server) — header (Categories, New post); Published and Drafts groups; rows show title, `/blog/slug`, category, published/edited date, an "Unpublished" tag when `published_at` is set on a draft; Edit + View/Preview. Empty state with "Write the first post".
- `/admin/blog/new`, `/admin/blog/[id]` (server shells) → `BlogEditor` (client; keyed on `updated_at` so it remounts on the stored copy). Steps: 1 headline and search appearance (title, focus keyword, SEO title with counter, meta description with counter, web address with `/blog/` prefix, follows the title until edited, read-only once locked, Google preview); 2 cover image (`CoverImageField`: upload/replace, alt text); 3 introduction; 4 sections (heading + `RichTextEditor`, add/reorder/remove); 5 FAQs; 6 call to action (destination select, button text, "Links to …"); 7 listing details (category, author, summary). Sticky sidebar: status pill + unsaved marker; Publish (disabled until required items pass) / Save draft, or Save changes when live; Preview; View live; Unpublish; Delete draft (confirm dialog, only if never published); error box listing blockers; `SeoChecklistPanel`. `beforeunload` guard when dirty.
- `RichTextEditor` — Tiptap `StarterKit` limited to H3, lists, bold, italic, link (validated with `safeHref`); toolbar with link input; `immediatelyRender: false`.
- `/admin/blog/categories` — `CategoryRow` (inline edit of name, description, order; delete disabled while used) + `NewCategoryForm`.

New dependencies: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extensions`.

## Public UI

Components in `components/blog/` (`blog-card.tsx`, `blog-listing.tsx`, `blog-article.tsx`). Light site styling, blue-900 headings matching the current blog, `max-w-7xl` container.

- `/blog` — server component; `?page=N`; H1 "Car Care Tips & News"; category chips; feature card first on page 1; 3-column grid; Newer/Older pagination; canonical per page; RSS alternate in `<head>`; out-of-range page → 404; empty state linking to `/service`. The current `layout.tsx` metadata moves into `generateMetadata`.
- `/blog/category/[slug]` — same listing, filtered; breadcrumbs; description as intro and meta; 404 when nothing published.
- `/blog/[slug]` — `revalidate = 300` + action-driven `revalidatePath`. Breadcrumbs; category eyebrow; H1; summary; byline "By author · date · Updated date · N min read" ("Updated" only on a different day); cover via `next/image` with `priority`; table of contents when ≥ 2 headed sections (sticky rail on lg, `<details>` below); intro (lead first paragraph); sections rendered **only** via `renderRichDocToHtml`; CTA panel (blue-900, destination heading and button, plus "Or see all three services" → `/services`); FAQ `<details>`; related posts. Metadata: `title: { absolute: seoTitle || title }`, description = meta description or summary, canonical, OpenGraph `article` with published/modified time, section, tags, cover image + alt (falls back to `OG_IMAGE`), Twitter `summary_large_image`. JSON-LD Article + BreadcrumbList + FAQPage.
- `/blog/preview/[id]` — admin-only (DB role check; anyone else gets `notFound()`), `noindex`, no JSON-LD, banner "Draft preview — only admins can see this" / "Preview of a live post", "Back to editor".
- `/blog/rss.xml` — RSS 2.0, newest 30, `s-maxage=300`.
- `app/sitemap.ts` — `/blog` `lastModified` = newest post update, `weekly`, 0.7; each public category (0.5); each published post (`updated_at`, monthly, 0.6). Fail-soft.
- `app/robots.ts` — add `/blog/preview` to `disallow`.
- `app/globals.css` — `.blog-prose` (paragraph rhythm, H3, links, lists, markers) and `.blog-editor-content .ProseMirror` sharing the same look, on TLP tokens (`--foreground`, `--muted-foreground`, `--border`).

## Error handling

- Public reads never throw into a page: listing errors render the empty state and are logged; a missing post or category is a real 404.
- Actions return typed results; the editor shows a toast, field errors under fields, and a blocker list in the sidebar. Unexpected exceptions propagate (Next error boundary).
- Storage problems: a missing bucket → "Image storage is not set up yet"; a failed upload shows the storage message; a stored object that fails re-check is deleted.

## Testing

Vitest (`lib/**/*.test.ts`):

- `lib/blog/rich-text.test.ts`, `slug.test.ts`, `seo-checklist.test.ts`, `post.test.ts` — ported from ATH and adapted.
- `lib/blog/cta.test.ts` — every destination's href/heading/default; unknown destination → fallback; custom button text kept.
- `lib/blog/json-ld.test.ts` — `</script>` in a title is escaped; FAQPage null when empty; default author → Organization.
- `lib/blog/images.test.ts` — accepts bucket URLs (new and legacy paths), rejects other buckets, other hosts, and traversal.
- `legacyContentToBody` cases in `post.test.ts`.

Then `npm test`, `npm run lint`, `npm run build`, and a manual browser pass: create category → new post → checklist blocks → fill → publish → public page, category page, RSS, sitemap → unpublish → 404 → preview as admin.

## Rollout

1. Apply the migration in Supabase (SQL editor), then deploy straight after — the new pages read the new columns. In the gap between the two, the old public pages keep working (columns are only added, and published posts stay readable), but the **old admin cannot save**: its browser-side writes lose their policies. Don't edit posts in that window.
2. Deploy.
3. Existing posts appear converted. Editors add meta descriptions, alt text and headings when they next edit each live post.
