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

// ---------------------------------------------------------------------------
// Pre-template posts
// ---------------------------------------------------------------------------

type LegacyBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

const RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const MD_HEADING = /^(#{1,6})\s+(.+?)\s*#*$/;
const BULLET = /^[-*•]\s+/;
const SENTENCE_END = /[.!?,;:…]$/;

/** Letters and digits only, lowercased — for "is this block just the title again?". */
function looseKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Short, starts like a title, and does not end like a sentence. */
function looksLikeHeading(line: string): boolean {
  return line.length <= 90 && /^[\p{Lu}\p{N}]/u.test(line) && !SENTENCE_END.test(line);
}

/** Two or more short lines, none of which ends like a sentence. */
function looksLikeList(lines: string[]): boolean {
  return lines.length >= 2 && lines.every((l) => l.length <= 80 && !SENTENCE_END.test(l));
}

function classify(block: string): LegacyBlock | null {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length === 1) {
    const [line] = lines;
    if (RULE.test(line)) return null;
    const md = MD_HEADING.exec(line);
    if (md) return { kind: "heading", level: Math.min(md[1].length, 3) as 1 | 2 | 3, text: md[2] };
    if (looksLikeHeading(line)) return { kind: "heading", level: 2, text: line };
    return { kind: "paragraph", text: line };
  }
  if (lines.every((l) => BULLET.test(l))) return { kind: "list", items: lines.map((l) => l.replace(BULLET, "")) };
  if (looksLikeList(lines)) return { kind: "list", items: lines };
  return { kind: "paragraph", text: lines.join(" ") };
}

/**
 * Some posts were typed with single line breaks between paragraphs. A block
 * of three or more lines where most END like sentences is that, not a hard-
 * wrapped paragraph (whose lines break mid-sentence) — split it line by line.
 */
function splitLinePerParagraph(block: string): string[] {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const sentences = lines.filter((l) => /[.!?]["”’)]?$/.test(l)).length;
  return lines.length >= 3 && sentences * 2 >= lines.length ? lines : [block];
}

const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

/** `**bold**` → bold marks; everything else is text. */
function inlines(s: string): unknown[] {
  return s
    .split(/(\*\*.+?\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      /^\*\*.+\*\*$/.test(part)
        ? { type: "text", text: part.slice(2, -2), marks: [{ type: "bold" }] }
        : { type: "text", text: part },
    );
}

function richBlock(b: LegacyBlock): unknown {
  if (b.kind === "list") {
    return {
      type: "bulletList",
      content: b.items.map((i) => ({ type: "listItem", content: [{ type: "paragraph", content: inlines(i) }] })),
    };
  }
  if (b.kind === "heading") return { type: "heading", attrs: { level: 3 }, content: inlines(b.text) };
  return { type: "paragraph", content: inlines(b.text) };
}

/**
 * The plain-text `content` of a pre-template post, as the template.
 *
 * Those posts were typed into a textarea, so their structure is implied rather
 * than marked up: a short line with no closing punctuation is a heading
 * ("Bugs Become More Common During Summer", "1. Park Your Vehicle…"), a block
 * of short lines is a list, and a few posts use markdown (#, **bold**, ---).
 * Recovering that structure is what gives a converted post real H2s, a table
 * of contents and readable lists instead of a wall of equal paragraphs.
 *
 * The 20261007000000 migration did a simpler first pass in SQL (paragraphs
 * only); posts still holding that are laid out with this at read time
 * (lib/blog/rows.ts).
 */
/**
 * What the 20261007000000 migration's SQL backfill produced: paragraphs only,
 * the first one as the intro. A stored body equal to this has never been
 * saved from the editor, so it can be laid out again from `content`.
 */
export function legacyFirstPassBody(content: string | null | undefined): BlogBody {
  const paragraphs = introParagraphs((content ?? "").replace(/\r\n?/g, "\n"));
  if (paragraphs.length === 0) return { intro: "", sections: [] };
  const [first, ...rest] = paragraphs;
  return normaliseBody({
    intro: first,
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
  });
}

export function legacyContentToBody(content: string | null | undefined, title = ""): BlogBody {
  const blocks = (content ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .flatMap(splitLinePerParagraph)
    .map(classify)
    .filter((b): b is LegacyBlock => b !== null);

  // Many posts open by repeating their title, which the page already shows as the H1.
  const first = blocks[0];
  if (
    first &&
    ((first.kind === "heading" && first.level === 1) ||
      (first.kind !== "list" && !!title && looseKey(first.text) === looseKey(title)))
  ) {
    blocks.shift();
  }

  const isSectionHeading = (b: LegacyBlock | undefined) => b?.kind === "heading" && b.level <= 2;
  const intro: string[] = [];
  let i = 0;
  if (blocks.some(isSectionHeading)) {
    // Leading paragraphs are the intro — except one that introduces a list ("We offer:").
    while (blocks[i]?.kind === "paragraph" && blocks[i + 1]?.kind !== "list") {
      intro.push(plain((blocks[i++] as { text: string }).text));
    }
  } else if (blocks[0]?.kind === "paragraph") {
    intro.push(plain(blocks[0].text));
    i = 1;
  }

  const sections: { heading: string; content: { type: "doc"; content: unknown[] } }[] = [];
  for (const b of blocks.slice(i)) {
    if (isSectionHeading(b)) {
      sections.push({ heading: plain((b as { text: string }).text), content: { type: "doc", content: [] } });
      continue;
    }
    if (sections.length === 0) sections.push({ heading: "", content: { type: "doc", content: [] } });
    sections[sections.length - 1].content.content.push(richBlock(b));
  }

  // Through the normaliser, so the result obeys the same limits and allow-list as a saved post.
  return normaliseBody({ intro: intro.join("\n\n"), sections });
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
