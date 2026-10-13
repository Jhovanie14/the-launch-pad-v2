import { cache } from "react";
import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/log/logger";
import { CARD_COLUMNS, FULL_COLUMNS, toCard, toPost, type BlogCard, type BlogPostFull, type CardRow, type FullRow } from "./rows";

/**
 * Public blog reads. Every query filters `published = true` — RLS enforces
 * the same, but a draft must never depend on one layer alone.
 *
 * Deliberately NOT utils/supabase/server.ts: that client reads cookies, which
 * opts a route into dynamic rendering. These reads are the same for every
 * visitor, so an anon client keeps the post pages cacheable (same reasoning
 * as lib/products/queries.ts).
 */

export const BLOG_PAGE_SIZE = 12;

function blogClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** PostgREST answers a range past the end with PGRST103 — that is "no posts", not a failure. */
const RANGE_NOT_SATISFIABLE = "PGRST103";

/** One page of published posts, newest first. Returns an empty page rather than throwing. */
export async function publishedPostsPage(opts: {
  page: number;
  categoryId?: string;
}): Promise<{ posts: BlogCard[]; total: number; pageCount: number }> {
  const page = Math.max(1, Math.floor(opts.page));
  const from = (page - 1) * BLOG_PAGE_SIZE;
  let query = blogClient().from("blog_posts").select(CARD_COLUMNS, { count: "exact" }).eq("published", true);
  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + BLOG_PAGE_SIZE - 1);

  if (error) {
    if (error.code !== RANGE_NOT_SATISFIABLE) logger.error("blog.list_failed", error);
    return { posts: [], total: 0, pageCount: 1 };
  }
  const total = count ?? 0;
  return {
    posts: (data as unknown as CardRow[]).map(toCard),
    total,
    pageCount: Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE)),
  };
}

/** Cached per request: generateMetadata and the page both ask for it. */
export const publishedPostBySlug = cache(async function publishedPostBySlug(
  slug: string,
): Promise<BlogPostFull | null> {
  const { data, error } = await blogClient()
    .from("blog_posts")
    .select(FULL_COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) {
    logger.error(`blog.post_failed slug=${slug}`, error);
    return null;
  }
  return data ? toPost(data as unknown as FullRow) : null;
});

/**
 * Up to `limit` other published posts — same category first, topped up with
 * the newest posts from anywhere so a category of one still gets a row.
 */
export async function relatedPosts(
  post: { id: string; categoryId: string | null },
  limit = 3,
): Promise<BlogCard[]> {
  const db = blogClient();
  let sameCategory: BlogCard[] = [];
  if (post.categoryId) {
    const { data } = await db
      .from("blog_posts")
      .select(CARD_COLUMNS)
      .eq("published", true)
      .eq("category_id", post.categoryId)
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .limit(limit);
    sameCategory = ((data ?? []) as unknown as CardRow[]).map(toCard);
  }
  if (sameCategory.length >= limit) return sameCategory;

  const { data } = await db
    .from("blog_posts")
    .select(CARD_COLUMNS)
    .eq("published", true)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(limit + sameCategory.length);
  const seen = new Set(sameCategory.map((p) => p.id));
  const recent = ((data ?? []) as unknown as CardRow[]).map(toCard).filter((p) => !seen.has(p.id));
  return [...sameCategory, ...recent].slice(0, limit);
}

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  postCount: number;
  lastModified: Date;
};

type CategoryWithPosts = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  blog_posts: { updated_at: string }[];
};

/** Categories with at least one published post — the filter chips and sitemap entries. */
export async function publicCategories(): Promise<PublicCategory[]> {
  const { data, error } = await blogClient()
    .from("blog_categories")
    .select("id, slug, name, description, blog_posts!inner(updated_at)")
    .eq("blog_posts.published", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    logger.error("blog.categories_failed", error);
    return [];
  }
  return (data as unknown as CategoryWithPosts[]).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    postCount: c.blog_posts.length,
    lastModified: new Date(Math.max(...c.blog_posts.map((p) => new Date(p.updated_at).getTime()))),
  }));
}

export const categoryBySlug = cache(async function categoryBySlug(
  slug: string,
): Promise<{ id: string; slug: string; name: string; description: string | null } | null> {
  const { data, error } = await blogClient()
    .from("blog_categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    logger.error(`blog.category_failed slug=${slug}`, error);
    return null;
  }
  return data;
});

/** Newest published posts for the RSS feed. */
export async function rssPosts(limit = 30): Promise<BlogCard[]> {
  const { data, error } = await blogClient()
    .from("blog_posts")
    .select(CARD_COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    logger.error("blog.rss_failed", error);
    return [];
  }
  return (data as unknown as CardRow[]).map(toCard);
}

export async function publishedSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  const { data, error } = await blogClient()
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) {
    logger.error("blog.slugs_failed", error);
    return [];
  }
  return data.map((p) => ({ slug: p.slug, updatedAt: new Date(p.updated_at) }));
}

/**
 * /blog, each category with a published post, and every published post.
 * Fail-soft: a blog problem must not take the rest of the sitemap down, so
 * /blog is always listed and failures only drop the blog's own entries.
 */
export async function blogSitemapEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const posts = await publishedSlugs();
  const categories = posts.length ? await publicCategories() : [];
  const newest = posts.reduce<Date | null>((max, p) => (!max || p.updatedAt > max ? p.updatedAt : max), null);
  return [
    { url: `${base}/blog`, lastModified: newest ?? new Date(), changeFrequency: "weekly", priority: 0.7 },
    ...categories.map((c) => ({
      url: `${base}/blog/category/${c.slug}`,
      lastModified: c.lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
