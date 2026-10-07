import { normaliseCta, type BlogCta } from "./cta";
import {
  legacyContentToBody,
  legacyFirstPassBody,
  normaliseBody,
  normaliseFaq,
  type BlogBody,
  type BlogFaq,
} from "./post";

/**
 * Database rows → what pages render. The select lists live here beside the
 * mappers so a column added to one cannot be forgotten in the other.
 */

/** What a listing card needs — no body, so a page of twelve stays small. */
export const CARD_COLUMNS =
  "id, slug, title, excerpt, meta_description, cover_image, cover_image_alt, published_at, updated_at, category:blog_categories(slug, name)";

export const FULL_COLUMNS = `${CARD_COLUMNS}, seo_title, focus_keyword, category_id, author, body, faq, cta, published, created_at, content`;

type CategoryEmbed = { slug: string; name: string } | { slug: string; name: string }[] | null;

export type CardRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  meta_description: string | null;
  cover_image: string | null;
  cover_image_alt: string | null;
  published_at: string | null;
  updated_at: string;
  category: CategoryEmbed;
};

export type FullRow = CardRow & {
  seo_title: string | null;
  focus_keyword: string | null;
  category_id: string | null;
  author: string;
  body: unknown;
  faq: unknown;
  cta: unknown;
  published: boolean;
  created_at: string;
  /** Pre-template plain text; null for posts written in the editor. */
  content: string | null;
};

export type BlogCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  metaDescription: string | null;
  coverImage: string | null;
  coverImageAlt: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  categorySlug: string | null;
  categoryName: string | null;
};

export type BlogPostFull = BlogCard & {
  seoTitle: string | null;
  focusKeyword: string | null;
  categoryId: string | null;
  author: string;
  body: BlogBody;
  faq: BlogFaq[];
  cta: BlogCta | null;
  published: boolean;
  createdAt: Date;
};

/** PostgREST returns a many-to-one embed as an object, but untyped clients see an array. */
function embedded(c: CategoryEmbed): { slug: string; name: string } | null {
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

export function toCard(row: CardRow): BlogCard {
  const category = embedded(row.category);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    metaDescription: row.meta_description,
    coverImage: row.cover_image,
    coverImageAlt: row.cover_image_alt,
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    updatedAt: new Date(row.updated_at),
    categorySlug: category?.slug ?? null,
    categoryName: category?.name ?? null,
  };
}

/**
 * The body to render. A pre-template post whose body is still the migration's
 * flat first pass is laid out from its original text instead — headings,
 * lists and paragraph breaks recovered (legacyContentToBody) — so it reads
 * properly without rewriting the data. Once it is saved from the editor, the
 * stored body differs and is used as is.
 */
function bodyOf(row: FullRow): BlogBody {
  const stored = normaliseBody(row.body);
  if (!row.content?.trim()) return stored;
  const untouched = JSON.stringify(stored) === JSON.stringify(legacyFirstPassBody(row.content));
  return untouched ? legacyContentToBody(row.content, row.title) : stored;
}

/**
 * Re-normalise on read: what reaches a page is held to the same allow-list as
 * what was saved, whatever is in the column.
 */
export function toPost(row: FullRow): BlogPostFull {
  return {
    ...toCard(row),
    seoTitle: row.seo_title,
    focusKeyword: row.focus_keyword,
    categoryId: row.category_id,
    author: row.author,
    body: bodyOf(row),
    faq: normaliseFaq(row.faq),
    cta: normaliseCta(row.cta),
    published: row.published,
    createdAt: new Date(row.created_at),
  };
}
