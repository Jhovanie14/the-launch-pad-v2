import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { BlogCard } from "@/components/blog/blog-card";
import type { BlogCard as BlogCardData } from "@/lib/blog/rows";
import { cn } from "@/lib/utils";

export const BLOG_CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6";

/** Page links keep the category path and drop ?page=1 (one canonical URL per page). */
function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

export function BlogListing({
  eyebrow,
  title,
  intro,
  posts,
  page,
  pageCount,
  basePath,
  categories,
  activeCategorySlug,
  breadcrumb,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  posts: BlogCardData[];
  page: number;
  pageCount: number;
  basePath: string;
  categories: { slug: string; name: string }[];
  activeCategorySlug?: string;
  breadcrumb?: React.ReactNode;
}) {
  const [first, ...rest] = posts;
  const featureFirst = page === 1 && !activeCategorySlug && posts.length > 1;

  return (
    <main className={`${BLOG_CONTAINER} pb-24 pt-10 sm:pt-16`}>
      {breadcrumb}
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-blue-900 md:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{intro}</p>
      </header>

      {categories.length > 0 && (
        <nav aria-label="Blog categories" className="mt-10">
          <ul className="flex flex-wrap gap-2">
            <li>
              <CategoryChip href="/blog" active={!activeCategorySlug}>
                All posts
              </CategoryChip>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <CategoryChip href={`/blog/category/${c.slug}`} active={c.slug === activeCategorySlug}>
                  {c.name}
                </CategoryChip>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {posts.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-xl border border-dashed p-12 text-center">
          <BookOpen className="size-6 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-semibold text-foreground">No posts here yet</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            New car care guides are on their way. In the meantime, book a detail or drop by the self-service bays.
          </p>
          <Link href="/service" className="mt-5 text-sm font-medium text-blue-900 underline underline-offset-4">
            Book express detailing
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-6">
          {featureFirst && first && <BlogCard post={first} feature priority />}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(featureFirst ? rest : posts).map((post, i) => (
              <BlogCard key={post.id} post={post} priority={!featureFirst && i === 0} />
            ))}
          </div>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex items-center justify-between gap-4 border-t pt-6">
          {page > 1 ? (
            <Link
              href={pageHref(basePath, page - 1)}
              rel="prev"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-900 hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden /> Newer posts
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs tabular-nums text-muted-foreground">{`Page ${page} of ${pageCount}`}</span>
          {page < pageCount ? (
            <Link
              href={pageHref(basePath, page + 1)}
              rel="next"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-900 hover:underline"
            >
              Older posts <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}

function CategoryChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors",
        active
          ? "border-blue-900 bg-blue-900 text-white"
          : "bg-card text-muted-foreground hover:border-blue-900/40 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
