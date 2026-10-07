import { z } from "zod";
import { normaliseCta, type BlogCta } from "./cta";
import { isBlogImageUrl } from "./images";
import { BLOG_LIMITS, DEFAULT_AUTHOR, normaliseBody, normaliseFaq, type BlogBody, type BlogFaq } from "./post";
import { seoChecklist } from "./seo-checklist";
import { resolveSlugForSave } from "./slug";

/**
 * Every rule a save has to satisfy, as pure functions — the server action is
 * left with only the reads and the write.
 *
 * The editor posts a plain object (a post is a nested document). It is
 * untrusted all the same: scalars are validated here, and body/faq/cta are
 * rebuilt from an allow-list by the lib/blog normalisers.
 */

export type SaveIntent = "save" | "publish";

export type ExistingPost = { id: string; slug: string; published: boolean; published_at: string | null };

export type BlogPostWrite = {
  slug: string;
  title: string;
  seo_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  excerpt: string | null;
  cover_image: string | null;
  cover_image_alt: string | null;
  category_id: string | null;
  author: string;
  body: BlogBody;
  faq: BlogFaq[];
  cta: BlogCta | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

export type SaveFailure = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
  /** Labels of the required checklist items still missing. */
  blockers?: string[];
};

const text = (max: number) =>
  z
    .string()
    .max(max, `Keep this to ${max.toLocaleString("en-US")} characters or fewer`)
    .optional()
    .transform((v) => v?.trim() ?? "");

const postInputSchema = z.object({
  id: z.uuid().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Give the post a title before saving")
    .max(BLOG_LIMITS.title, `Keep the title to ${BLOG_LIMITS.title} characters or fewer`),
  seoTitle: text(BLOG_LIMITS.seoTitle),
  metaDescription: text(BLOG_LIMITS.metaDescription),
  focusKeyword: text(BLOG_LIMITS.focusKeyword),
  excerpt: text(BLOG_LIMITS.excerpt),
  slug: z.string().max(200).optional(),
  coverImage: z.string().max(1000).nullable().optional(),
  coverImageAlt: text(BLOG_LIMITS.coverAlt),
  categoryId: z.uuid().nullable().optional(),
  author: text(BLOG_LIMITS.author),
  body: z.unknown(),
  faq: z.unknown(),
  cta: z.unknown(),
});

export type PostInput = z.infer<typeof postInputSchema>;

function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function parsePostInput(input: unknown): { ok: true; data: PostInput } | SaveFailure {
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Some fields need attention.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  return { ok: true, data: parsed.data };
}

/**
 * What to write, or why not.
 *
 * Required checklist items block PUBLISH, never a draft save — EXCEPT when the
 * post is already live: saving a published post changes the live page, so it
 * is held to the publishing bar. To save a live post half-finished, unpublish
 * it first.
 */
export function planSave(args: {
  data: PostInput;
  intent: SaveIntent;
  existing: ExistingPost | null;
  categoryExists: boolean;
  now: Date;
  internalHosts: string[];
  supabaseUrl?: string;
}): { ok: true; values: BlogPostWrite } | SaveFailure {
  const { data: d, intent, existing, now } = args;

  const coverImage = d.coverImage ? d.coverImage : null;
  if (coverImage !== null && !isBlogImageUrl(coverImage, args.supabaseUrl)) {
    return {
      ok: false,
      error: "That cover image was not uploaded here. Upload it again.",
      fieldErrors: { coverImage: "Upload the cover image again." },
    };
  }

  const slugDecision = resolveSlugForSave({
    requested: d.slug,
    title: d.title,
    existing: existing ? { slug: existing.slug, publishedAt: existing.published_at } : null,
  });
  if (!slugDecision.ok) {
    return { ok: false, error: slugDecision.error, fieldErrors: { slug: slugDecision.error } };
  }

  if (d.categoryId && !args.categoryExists) {
    return {
      ok: false,
      error: "That category no longer exists. Choose another.",
      fieldErrors: { categoryId: "Choose another category." },
    };
  }

  const body = normaliseBody(d.body);
  const faq = normaliseFaq(d.faq);
  const cta = normaliseCta(d.cta);

  const goingLive = intent === "publish" || !!existing?.published;
  if (goingLive) {
    const checklist = seoChecklist({
      title: d.title,
      seoTitle: d.seoTitle,
      metaDescription: d.metaDescription,
      slug: slugDecision.slug,
      focusKeyword: d.focusKeyword,
      coverImage,
      coverImageAlt: d.coverImageAlt,
      body,
      faq,
      cta,
      internalHosts: args.internalHosts,
    });
    if (!checklist.canPublish) {
      return {
        ok: false,
        error:
          existing?.published && intent === "save"
            ? "This post is live, so it needs everything a published post needs. Fill in the items below, or unpublish it first."
            : "A few things are needed before this can be published.",
        blockers: checklist.blockers.map((b) => b.label),
      };
    }
  }

  const published = intent === "publish" ? true : (existing?.published ?? false);
  return {
    ok: true,
    values: {
      slug: slugDecision.slug,
      title: d.title,
      seo_title: d.seoTitle || null,
      meta_description: d.metaDescription || null,
      focus_keyword: d.focusKeyword || null,
      excerpt: d.excerpt || null,
      cover_image: coverImage,
      cover_image_alt: d.coverImageAlt || null,
      category_id: d.categoryId ?? null,
      author: d.author || DEFAULT_AUTHOR,
      body,
      faq,
      cta,
      published,
      // First publication only: an unpublish/republish keeps the original
      // date, and with it the locked slug.
      published_at: existing?.published_at ?? (published ? now.toISOString() : null),
      updated_at: now.toISOString(),
    },
  };
}

/** A failed insert/update the editor can explain, or null for a genuine fault. */
export function saveErrorFromDb(error: { code?: string } | null): SaveFailure | null {
  if (error?.code === "23505") {
    const message = "Another post already uses this web address. Change it slightly.";
    return { ok: false, error: message, fieldErrors: { slug: message } };
  }
  return null;
}
