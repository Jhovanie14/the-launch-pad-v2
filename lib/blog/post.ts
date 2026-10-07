/**
 * The shape of a blog post's templated content, and the pure helpers that
 * read it. Shared by the editor, the server actions, the public page and the
 * SEO checklist so they cannot disagree about what a post contains.
 *
 * The template is fixed on purpose: an intro, then H2-headed sections, then
 * FAQs, then a call to action. There is no free-form page builder — the
 * structure IS the SEO advice. (Ported from Aesthetic Training Hub.)
 */
import { countWords, normaliseRichDoc, richDocText, type RichDoc } from "./rich-text";
import { slugify } from "./slug";

export const DEFAULT_AUTHOR = "The Launch Pad";

export const BLOG_LIMITS = {
  title: 140,
  seoTitle: 120,
  metaDescription: 320,
  focusKeyword: 80,
  excerpt: 400,
  coverAlt: 250,
  intro: 3_000,
  sectionHeading: 140,
  sections: 30,
  faqs: 20,
  faqQuestion: 250,
  faqAnswer: 2_000,
  ctaButton: 60,
  author: 80,
} as const;

export type BlogSection = { heading: string; content: RichDoc };
export type BlogBody = { intro: string; sections: BlogSection[] };
export type BlogFaq = { question: string; answer: string };

export const EMPTY_BODY: BlogBody = { intro: "", sections: [] };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Multi-paragraph text keeps its paragraph breaks; everything else is trimmed. */
function multiline(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

/** Never throws: anything malformed comes back as the empty template. */
export function normaliseBody(input: unknown): BlogBody {
  if (!isObject(input)) return { intro: "", sections: [] };
  const sections = Array.isArray(input.sections) ? input.sections : [];
  return {
    intro: multiline(input.intro, BLOG_LIMITS.intro),
    sections: sections
      .filter(isObject)
      .slice(0, BLOG_LIMITS.sections)
      .map((s) => ({
        heading: str(s.heading, BLOG_LIMITS.sectionHeading),
        content: normaliseRichDoc(s.content),
      })),
  };
}

export function normaliseFaq(input: unknown): BlogFaq[] {
  if (!Array.isArray(input)) return [];
  return (
    input
      .filter(isObject)
      .map((f) => ({
        question: str(f.question, BLOG_LIMITS.faqQuestion),
        answer: multiline(f.answer, BLOG_LIMITS.faqAnswer),
      }))
      // A half-filled pair is a row someone added and abandoned — drop it
      // rather than publish a question with no answer into FAQPage markup.
      .filter((f) => f.question && f.answer)
      .slice(0, BLOG_LIMITS.faqs)
  );
}

/** Text split into the paragraphs it is rendered as. */
export function introParagraphs(intro: string): string[] {
  return intro
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/**
 * Stable, unique fragment ids for the section headings — the table of
 * contents links to them, so they must not collide when two headings slugify
 * the same.
 */
export function sectionAnchors(sections: Pick<BlogSection, "heading">[]): string[] {
  const used = new Map<string, number>();
  return sections.map((s, i) => {
    const base = slugify(s.heading) || `section-${i + 1}`;
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  });
}

/** Words a reader actually reads: intro, headings, section bodies, FAQs. */
export function postWordCount(post: { body: BlogBody; faq: BlogFaq[] }): number {
  const parts = [
    post.body.intro,
    ...post.body.sections.flatMap((s) => [s.heading, richDocText(s.content)]),
    ...post.faq.flatMap((f) => [f.question, f.answer]),
  ];
  return countWords(parts.join("\n"));
}

/** At ~220 words a minute, never less than one. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

/** The listing/meta summary: excerpt, else meta description, else the start of the intro. */
export function postSummary(post: {
  excerpt: string | null;
  metaDescription: string | null;
  body: BlogBody;
}): string {
  if (post.excerpt?.trim()) return post.excerpt.trim();
  if (post.metaDescription?.trim()) return post.metaDescription.trim();
  const first = introParagraphs(post.body.intro)[0] ?? "";
  return first.length > 200 ? `${first.slice(0, 197).trimEnd()}…` : first;
}

/**
 * The plain-text `content` of a pre-template post, as the template. Mirrors
 * the backfill in supabase/migrations/20261007000000_blog_seo.sql — change
 * one, change both.
 */
export function legacyContentToBody(content: string | null | undefined): BlogBody {
  const paragraphs = introParagraphs((content ?? "").replace(/\r\n?/g, "\n"));
  if (paragraphs.length === 0) return { intro: "", sections: [] };
  const [first, ...rest] = paragraphs;
  return {
    intro: first.slice(0, BLOG_LIMITS.intro),
    sections: rest.length
      ? [
          {
            heading: "",
            content: {
              type: "doc",
              content: rest.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
            },
          },
        ]
      : [],
  };
}

const TIME_ZONE = "America/Chicago";

/** "October 1, 2026", in Houston time. */
export function formatPostDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: TIME_ZONE });
}

/** "2026-10-01" in Houston time — for same-day comparisons. */
export function postDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

/** `?page=` as a page number: whole numbers above 1, everything else is page 1. */
export function pageFromParam(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 1 ? n : 1;
}
