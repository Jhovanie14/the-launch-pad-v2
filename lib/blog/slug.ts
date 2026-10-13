/**
 * Blog slugs: generated from the title, editable while a post is a draft,
 * PERMANENT from the moment it is first published.
 *
 * Why permanent: a published URL is what Google has indexed, what other sites
 * have linked to and what we have shared on social media. Changing it turns
 * every one of those into a 404 and throws away the ranking the post earned —
 * the opposite of what the blog is for.
 *
 * "First published" is `published_at IS NOT NULL`, NOT `published = true`:
 * a post that is unpublished to fix something has still been live, crawled
 * and linked, so it keeps its address when it comes back.
 */

export const SLUG_MAX_LENGTH = 80;

/**
 * Static routes that sit beside /blog/[slug] — a post with one of these slugs
 * would be shadowed by the route and unreachable.
 */
export const RESERVED_SLUGS = ["preview", "category", "rss", "page", "feed"] as const;

/** Lowercase, hyphenated, ASCII; "Ceramic Coating: A Beginner’s Guide" → "ceramic-coating-a-beginners-guide". */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/['’]/g, "") // "beginner's" → "beginners", not "beginner-s"
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= SLUG_MAX_LENGTH) return slug;
  // Cut at a word boundary rather than mid-word.
  const cut = slug.slice(0, SLUG_MAX_LENGTH);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > 20 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= SLUG_MAX_LENGTH &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}

/** Locked once the post has EVER been published. */
export function isSlugLocked(post: { publishedAt: Date | string | null }): boolean {
  return post.publishedAt !== null && post.publishedAt !== undefined;
}

export type SlugDecision = { ok: true; slug: string } | { ok: false; error: string };

/**
 * Which slug a save should store.
 *
 * - Locked post: the stored slug, always. A different value posted is refused
 *   loudly rather than ignored, so a forged or stale form cannot move a live
 *   URL and the editor is told why the edit did not take.
 * - Draft: what was typed (cleaned), else one generated from the title.
 */
export function resolveSlugForSave(args: {
  requested: string | undefined;
  title: string;
  existing?: { slug: string; publishedAt: Date | string | null } | null;
}): SlugDecision {
  const { requested, title, existing } = args;
  const cleaned = requested?.trim() ? slugify(requested) : "";

  if (existing && isSlugLocked(existing)) {
    // Compare the RAW value: pre-template posts carry hand-typed slugs that
    // slugify() would "correct", and a live address must round-trip as is.
    const raw = requested?.trim() ?? "";
    if (raw && raw !== existing.slug) {
      return {
        ok: false,
        error:
          "This post has been published, so its web address is permanent. Changing it would break every link to it.",
      };
    }
    return { ok: true, slug: existing.slug };
  }

  const slug = cleaned || slugify(title);
  if (!isValidSlug(slug)) {
    return { ok: false, error: "Give the post a web address (letters, numbers and hyphens)." };
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return { ok: false, error: `“${slug}” is used by the blog itself. Choose a different web address.` };
  }
  return { ok: true, slug };
}
