import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { BlogCard } from "@/components/blog/blog-card";
import { BLOG_CONTAINER } from "@/components/blog/blog-listing";
import { Breadcrumbs } from "@/components/blog/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ctaFor } from "@/lib/blog/cta";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLdString } from "@/lib/blog/json-ld";
import {
  formatPostDate,
  introParagraphs,
  postDayKey,
  postSummary,
  postWordCount,
  readingMinutes,
  sectionAnchors,
} from "@/lib/blog/post";
import { renderRichDocToHtml } from "@/lib/blog/rich-text";
import type { BlogCard as BlogCardData, BlogPostFull } from "@/lib/blog/rows";
import { SITE_HOST, SITE_URL } from "@/lib/blog/site";

const INTERNAL_HOSTS = [SITE_HOST];

/**
 * The reading layout for one post, shared by the public page and the
 * admin-only preview so the preview is exactly what readers get.
 *
 * Every piece of HTML in a section body comes from renderRichDocToHtml, which
 * rebuilds it from an allow-list and escapes all text — the only
 * dangerouslySetInnerHTML here apart from the JSON-LD (escaped by jsonLdString).
 */
export function BlogArticle({
  post,
  related,
  structuredData = true,
}: {
  post: BlogPostFull;
  related: BlogCardData[];
  /** Off for the preview: an unpublished page has no business carrying it. */
  structuredData?: boolean;
}) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const anchors = sectionAnchors(post.body.sections);
  const toc = post.body.sections
    .map((s, i) => ({ heading: s.heading, anchor: anchors[i] }))
    .filter((s) => s.heading);
  const hasToc = toc.length > 1;
  const minutes = readingMinutes(postWordCount({ body: post.body, faq: post.faq }));
  const published = post.publishedAt ?? post.updatedAt;
  // "Updated" only when it is a real revision, not the same-day publish save.
  const showUpdated = !!post.publishedAt && postDayKey(post.updatedAt) !== postDayKey(post.publishedAt);
  const intro = introParagraphs(post.body.intro);
  const cta = ctaFor(post.cta);

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Blog", href: "/blog" },
    ...(post.categorySlug && post.categoryName
      ? [{ name: post.categoryName, href: `/blog/category/${post.categorySlug}` }]
      : []),
  ];
  const faqLd = faqJsonLd(post.faq);
  const ld = [
    articleJsonLd({
      url,
      headline: post.title,
      description: post.metaDescription ?? postSummary(post),
      imageUrl: post.coverImage,
      datePublished: published,
      dateModified: post.updatedAt,
      authorName: post.author,
      section: post.categoryName,
      keyword: post.focusKeyword,
    }),
    breadcrumbJsonLd([
      ...crumbs.map((c) => ({ name: c.name, url: `${SITE_URL}${c.href === "/" ? "" : c.href}` })),
      { name: post.title, url },
    ]),
    ...(faqLd ? [faqLd] : []),
  ];

  return (
    <>
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(ld) }} />
      )}

      <article className="pb-24">
        <div className={`${BLOG_CONTAINER} pt-8 sm:pt-12`}>
          <Breadcrumbs items={crumbs} />

          <header className="mx-auto max-w-3xl text-center">
            {post.categoryName && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{post.categoryName}</p>
            )}
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-blue-900 md:text-5xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
            )}
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
              <span>{`By ${post.author}`}</span>
              <span aria-hidden>·</span>
              <time dateTime={published.toISOString()}>{formatPostDate(published)}</time>
              {showUpdated && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {"Updated "}
                    <time dateTime={post.updatedAt.toISOString()}>{formatPostDate(post.updatedAt)}</time>
                  </span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>{`${minutes} min read`}</span>
            </p>
          </header>

          {post.coverImage && (
            <div className="relative mx-auto mt-10 aspect-video w-full max-w-5xl overflow-hidden rounded-xl bg-muted">
              <Image
                src={post.coverImage}
                alt={post.coverImageAlt ?? ""}
                fill
                priority
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-cover"
              />
            </div>
          )}
        </div>

        <div className={`${BLOG_CONTAINER} mt-12 lg:mt-16`}>
          <div
            className={
              hasToc
                ? "mx-auto grid max-w-5xl gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14"
                : "mx-auto grid max-w-[68ch]"
            }
          >
            {/* Table of contents — a disclosure on small screens, a sticky rail on large. */}
            {hasToc && (
              <aside>
                <div className="lg:sticky lg:top-24">
                  <details className="group rounded-xl border bg-card p-5 lg:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                      In this guide
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <TocList items={toc} className="mt-4" />
                  </details>
                  <nav aria-label="In this guide" className="hidden lg:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">In this guide</p>
                    <TocList items={toc} className="mt-4" />
                  </nav>
                </div>
              </aside>
            )}

            <div className="min-w-0 max-w-[68ch]">
              {intro.length > 0 && (
                <div className="blog-prose">
                  {intro.map((p, i) => (
                    <p key={i} className={i === 0 ? "text-xl leading-relaxed text-foreground" : undefined}>
                      {p}
                    </p>
                  ))}
                </div>
              )}

              {post.body.sections.map((section, i) => (
                <section
                  key={anchors[i]}
                  aria-labelledby={section.heading ? anchors[i] : undefined}
                  className="mt-12"
                >
                  {section.heading && (
                    <h2 id={anchors[i]} className="scroll-mt-28 text-2xl font-semibold tracking-tight text-blue-900 sm:text-3xl">
                      {section.heading}
                    </h2>
                  )}
                  <div
                    className="blog-prose mt-5"
                    dangerouslySetInnerHTML={{
                      __html: renderRichDocToHtml(section.content, { internalHosts: INTERNAL_HOSTS }),
                    }}
                  />
                </section>
              ))}

              {/* Call to action — always present: a reader who has just learned
                  how to look after their car should be one click from booking. */}
              <aside className="mt-16 overflow-hidden rounded-xl bg-blue-900 p-8 text-white sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                  The Launch Pad · 10410 S Main St
                </p>
                <p className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{cta.heading}</p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80">{cta.body}</p>
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Button asChild size="lg" className="bg-white text-blue-900 hover:bg-white/90">
                    <Link href={cta.href}>
                      {cta.buttonText}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                  {cta.href !== "/services" && (
                    <Link href="/services" className="text-sm text-white/80 underline underline-offset-4 hover:text-white">
                      Or see all three services
                    </Link>
                  )}
                </div>
              </aside>

              {post.faq.length > 0 && (
                <section aria-labelledby="faq" className="mt-16">
                  <h2 id="faq" className="scroll-mt-28 text-2xl font-semibold tracking-tight text-blue-900 sm:text-3xl">
                    Frequently asked questions
                  </h2>
                  <div className="mt-6 divide-y border-y">
                    {post.faq.map((f, i) => (
                      <details key={i} className="group py-5" open={i === 0}>
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-6 [&::-webkit-details-marker]:hidden">
                          <h3 className="text-base font-medium text-foreground">{f.question}</h3>
                          <ChevronDown
                            className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                            aria-hidden
                          />
                        </summary>
                        <div className="blog-prose mt-3 text-base">
                          {introParagraphs(f.answer).map((p, j) => (
                            <p key={j}>{p}</p>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related" className={`${BLOG_CONTAINER} mt-24`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Keep reading</p>
                <h2 id="related" className="mt-3 text-2xl font-semibold tracking-tight text-blue-900 sm:text-3xl">
                  {post.categoryName ? `More on ${post.categoryName.toLowerCase()}` : "More from the blog"}
                </h2>
              </div>
              <Link href="/blog" className="text-sm font-medium text-blue-900 underline underline-offset-4">
                All posts
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <BlogCard key={r.id} post={r} headingLevel="h3" />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

function TocList({ items, className }: { items: { heading: string; anchor: string }[]; className?: string }) {
  return (
    <ol className={`grid gap-3 border-l ${className ?? ""}`}>
      {items.map((item) => (
        <li key={item.anchor}>
          <a
            href={`#${item.anchor}`}
            className="-ml-px block border-l border-transparent pl-4 text-sm leading-snug text-muted-foreground transition-colors hover:border-blue-900 hover:text-foreground"
          >
            {item.heading}
          </a>
        </li>
      ))}
    </ol>
  );
}
