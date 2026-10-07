/**
 * The blog editor's SEO checklist — ONE pure function, used live in the
 * editor (as the post is written) and again by the publish action (as the gate), so
 * the panel and the server can never disagree about whether a post is ready.
 *
 * Two kinds of item:
 *   - REQUIRED (`blocksPublish: true`): title, web address, meta description,
 *     cover image + alt text, intro, at least one section with writing in it.
 *     These stop PUBLISH. They never stop "Save draft" — a draft is allowed
 *     to be half-written.
 *   - ADVISORY: keyword placement, lengths, word count, links. Shown as
 *     warnings and never block anything. They are good practice, not rules,
 *     and a checklist that refuses to publish a good post over a 61-character
 *     title teaches people to game the checklist.
 *
 * Tested in lib/blog/seo-checklist.test.ts.
 */
import { isInternalHref, richDocLinks, richDocText } from "./rich-text";
import { introParagraphs, postWordCount, type BlogBody, type BlogFaq } from "./post";
import type { BlogCta } from "./cta";
import { isValidSlug } from "./slug";

export const SEO_TITLE_MAX = 60;
export const META_DESCRIPTION_MIN = 120;
export const META_DESCRIPTION_MAX = 158;
export const MIN_WORD_COUNT = 600;

export type CheckStatus = "pass" | "warn" | "fail";

export type CheckItem = {
  id: string;
  label: string;
  status: CheckStatus;
  /** One line saying what to do, or confirming it is done. */
  detail: string;
  /** Needed to publish (whether or not it is satisfied yet). */
  required: boolean;
  /** Required AND not yet satisfied. */
  blocksPublish: boolean;
};

export type ChecklistInput = {
  title: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  focusKeyword: string;
  coverImage: string | null;
  coverImageAlt: string;
  body: BlogBody;
  faq: BlogFaq[];
  cta: BlogCta | null;
  /** Hosts that count as "our site" for absolute links (e.g. the prod domain). */
  internalHosts?: string[];
};

export type ChecklistResult = {
  items: CheckItem[];
  /** Required items that are not yet satisfied. Empty = publishable. */
  blockers: CheckItem[];
  canPublish: boolean;
  wordCount: number;
  /** The title Google is shown: the SEO title, else the post title. */
  effectiveSeoTitle: string;
};

/** Lowercase words separated by single spaces, punctuation gone. */
function normaliseForMatch(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Whole-phrase, case-insensitive: "ceramic coating" matches "Ceramic-coating guide", not "ceramic coatings"…  */
export function containsKeyword(haystack: string, keyword: string): boolean {
  const needle = normaliseForMatch(keyword);
  if (!needle) return false;
  return ` ${normaliseForMatch(haystack)} `.includes(` ${needle} `);
}

function item(
  id: string,
  label: string,
  ok: boolean,
  okDetail: string,
  notOkDetail: string,
  opts: { required?: boolean } = {},
): CheckItem {
  return {
    id,
    label,
    status: ok ? "pass" : opts.required ? "fail" : "warn",
    detail: ok ? okDetail : notOkDetail,
    required: !!opts.required,
    blocksPublish: !ok && !!opts.required,
  };
}

export function seoChecklist(input: ChecklistInput): ChecklistResult {
  const title = input.title.trim();
  const seoTitle = input.seoTitle.trim();
  const effectiveSeoTitle = seoTitle || title;
  const meta = input.metaDescription.trim();
  const keyword = input.focusKeyword.trim();
  const sections = input.body.sections;
  const firstParagraph = introParagraphs(input.body.intro)[0] ?? "";
  const sectionsWithWriting = sections.filter((s) => richDocText(s.content).trim().length > 0);
  const wordCount = postWordCount({ body: input.body, faq: input.faq });

  const items: CheckItem[] = [];

  // --- Required -----------------------------------------------------------
  items.push(
    item("title", "Post title", title.length > 0, "Title set.", "Add a title — it is the headline (H1) of the post.", {
      required: true,
    }),
  );
  items.push(
    item(
      "slug",
      "Web address",
      isValidSlug(input.slug.trim()),
      `/blog/${input.slug.trim()}`,
      "Add a web address — letters, numbers and hyphens only.",
      { required: true },
    ),
  );
  items.push(
    item(
      "meta-present",
      "Meta description",
      meta.length > 0,
      "Meta description written.",
      "Write a meta description — it is the summary Google shows under your title.",
      { required: true },
    ),
  );
  const hasCover = !!input.coverImage;
  const hasAlt = input.coverImageAlt.trim().length > 0;
  items.push(
    item(
      "cover",
      "Cover image with alt text",
      hasCover && hasAlt,
      "Cover image and description in place.",
      !hasCover
        ? "Upload a cover image — it is the picture shown when the post is shared."
        : "Describe the cover image in the alt text box, for screen readers and Google Images.",
      { required: true },
    ),
  );
  items.push(
    item(
      "intro",
      "Introduction",
      firstParagraph.length > 0,
      "Introduction written.",
      "Write the introduction — the opening paragraph that tells the reader what they will learn.",
      { required: true },
    ),
  );
  items.push(
    item(
      "sections",
      "At least one section",
      sectionsWithWriting.length > 0,
      `${sections.length} section${sections.length === 1 ? "" : "s"}.`,
      "Add at least one section with a heading and some writing.",
      { required: true },
    ),
  );

  // --- Advisory: keyword ----------------------------------------------------
  if (!keyword) {
    items.push({
      id: "keyword",
      label: "Focus keyword",
      status: "warn",
      detail: "Choose the one phrase you want this post to be found for, e.g. “ceramic coating houston”.",
      required: false,
      blocksPublish: false,
    });
  } else {
    items.push(
      item(
        "keyword-title",
        "Keyword in the title",
        containsKeyword(title, keyword),
        "The title contains your keyword.",
        `Work “${keyword}” into the post title.`,
      ),
    );
    items.push(
      item(
        "keyword-seo-title",
        "Keyword in the SEO title",
        containsKeyword(effectiveSeoTitle, keyword),
        "The SEO title contains your keyword.",
        `Work “${keyword}” into the SEO title — ideally near the start.`,
      ),
    );
    items.push(
      item(
        "keyword-intro",
        "Keyword in the first paragraph",
        containsKeyword(firstParagraph, keyword),
        "The opening paragraph uses your keyword.",
        `Use “${keyword}” in the first paragraph of the introduction.`,
      ),
    );
    items.push(
      item(
        "keyword-heading",
        "Keyword in a section heading",
        sections.some((s) => containsKeyword(s.heading, keyword)),
        "At least one section heading uses your keyword.",
        `Use “${keyword}” (or a close variant) in at least one section heading.`,
      ),
    );
    items.push(
      item(
        "keyword-meta",
        "Keyword in the meta description",
        containsKeyword(meta, keyword),
        "The meta description uses your keyword.",
        `Use “${keyword}” in the meta description — Google bolds it in results.`,
      ),
    );
    items.push(
      item(
        "keyword-slug",
        "Keyword in the web address",
        containsKeyword(input.slug.replace(/-/g, " "), keyword),
        "The web address contains your keyword.",
        "Put the keyword in the web address while the post is still a draft — it cannot change after publishing.",
      ),
    );
  }

  // --- Advisory: lengths ---------------------------------------------------
  items.push(
    item(
      "seo-title-length",
      "SEO title length",
      effectiveSeoTitle.length > 0 && effectiveSeoTitle.length <= SEO_TITLE_MAX,
      `${effectiveSeoTitle.length} characters — fits in Google results.`,
      effectiveSeoTitle.length === 0
        ? "Add a title or SEO title."
        : `${effectiveSeoTitle.length} characters — Google cuts titles off at about ${SEO_TITLE_MAX}. Shorten it.`,
    ),
  );
  items.push(
    item(
      "meta-length",
      "Meta description length",
      meta.length >= META_DESCRIPTION_MIN && meta.length <= META_DESCRIPTION_MAX,
      `${meta.length} characters — a good length.`,
      meta.length < META_DESCRIPTION_MIN
        ? `${meta.length} characters — aim for ${META_DESCRIPTION_MIN}–${META_DESCRIPTION_MAX} so Google has a full summary to show.`
        : `${meta.length} characters — Google cuts it off after about ${META_DESCRIPTION_MAX}. Trim it.`,
    ),
  );

  // --- Advisory: content ---------------------------------------------------
  items.push(
    item(
      "word-count",
      `At least ${MIN_WORD_COUNT} words`,
      wordCount >= MIN_WORD_COUNT,
      `${wordCount.toLocaleString("en-US")} words.`,
      `${wordCount.toLocaleString("en-US")} words so far — thorough posts of ${MIN_WORD_COUNT}+ words tend to rank better.`,
    ),
  );
  const hasInternalLink = sections.some((s) =>
    richDocLinks(s.content).some((href) => isInternalHref(href, input.internalHosts)),
  );
  const hasCta = !!input.cta?.destination;
  items.push(
    item(
      "internal-link",
      "Links to the rest of the site",
      hasInternalLink || hasCta,
      hasCta ? "The call to action sends readers to a booking or service page." : "Links to another page on the site.",
      "Link to booking, a service page or another post — or choose a call to action below.",
    ),
  );
  const unheaded = sections.filter((s) => !s.heading.trim()).length;
  items.push(
    item(
      "section-headings",
      "Every section has a heading",
      sections.length > 0 && unheaded === 0,
      "Every section has a heading.",
      sections.length === 0
        ? "Add a section with a heading."
        : `${unheaded} section${unheaded === 1 ? " has" : "s have"} no heading — headings are how Google (and skim-readers) understand a post.`,
    ),
  );

  const blockers = items.filter((i) => i.blocksPublish);
  return { items, blockers, canPublish: blockers.length === 0, wordCount, effectiveSeoTitle };
}
