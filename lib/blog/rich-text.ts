/**
 * The blog's constrained rich text — what a section body is allowed to be,
 * and the ONLY way it becomes HTML.
 *
 * Section bodies are written in a Tiptap editor
 * (components/admin/blog/rich-text-editor.tsx) and stored as its ProseMirror JSON. The
 * editor is configured to offer only paragraphs, bold, italic, links, bullet
 * and numbered lists and H3 — but the editor is a convenience, not the
 * boundary. A server action receives whatever JSON a browser posts, so:
 *
 *   1. `normaliseRichDoc` runs on SAVE and rebuilds the document from an
 *      allow-list: unknown node types are unwrapped (their allowed children
 *      kept) or dropped, unknown marks and every unknown attribute are
 *      discarded, link hrefs go through `safeHref`, and any heading becomes
 *      an H3 (H1 is the post title, H2s are the template's section headings).
 *   2. `renderRichDocToHtml` runs on READ and normalises AGAIN before
 *      emitting anything, escaping every text node and attribute. Nothing
 *      an editor (or a forged request) typed is ever emitted as markup.
 *
 * Pure and dependency-free so both halves are unit-tested
 * (lib/blog/rich-text.test.ts), and so the renderer needs no DOM on
 * the server.
 */

export type RichMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } };

export type RichInline =
  | { type: "text"; text: string; marks?: RichMark[] }
  | { type: "hardBreak" };

export type RichListItem = { type: "listItem"; content: RichBlock[] };

export type RichBlock =
  | { type: "paragraph"; content?: RichInline[] }
  | { type: "heading"; attrs: { level: 3 }; content?: RichInline[] }
  | { type: "bulletList"; content: RichListItem[] }
  | { type: "orderedList"; attrs?: { start: number }; content: RichListItem[] };

export type RichDoc = { type: "doc"; content: RichBlock[] };

export const EMPTY_RICH_DOC: RichDoc = { type: "doc", content: [] };

/** Lists nest; a forged document must not be able to recurse forever. */
const MAX_DEPTH = 6;
/** Generous for a blog section, small enough to bound a forged payload. */
const MAX_TEXT_LENGTH = 20_000;
const MAX_NODES = 5_000;

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/**
 * The href if it is safe to emit, otherwise null.
 *
 * Allowed: site-relative paths ("/service", not protocol-relative "//evil"),
 * in-page anchors, and http(s)/mailto/tel. Everything else — javascript:,
 * data:, vbscript:, file: and any scheme we have not thought of — is refused.
 * Whitespace and control characters are stripped before the scheme check
 * because browsers ignore them ("java\nscript:" still runs).
 */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  const compact = trimmed.replace(/[\s\u0000-\u001f\u007f]+/g, "");

  if (compact.startsWith("/")) {
    // "//host" and "/\host" are protocol-relative to a browser.
    return /^\/[/\\]/.test(compact) ? null : compact;
  }
  if (compact.startsWith("#")) return compact;

  const lower = compact.toLowerCase();
  if (/^(https?:\/\/|mailto:|tel:)/.test(lower)) {
    if (lower.startsWith("http")) {
      try {
        const url = new URL(compact);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return url.toString();
      } catch {
        return null;
      }
    }
    return compact;
  }

  // A bare "www.example.com" typed into the link box: treat as https rather
  // than as a relative path that would 404 on our own domain.
  if (/^www\.[^/\s]+\.[a-z]{2,}/i.test(compact)) {
    try {
      return new URL(`https://${compact}`).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/** Internal = site-relative, or absolute on one of the given hosts. */
export function isInternalHref(href: string, internalHosts: string[] = []): boolean {
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    return internalHosts.some((h) => h.replace(/^www\./, "") === host);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Normalisation (the allow-list)
// ---------------------------------------------------------------------------

type Budget = { nodes: number };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function childrenOf(node: Record<string, unknown>): unknown[] {
  return Array.isArray(node.content) ? node.content : [];
}

function normaliseMarks(raw: unknown): RichMark[] {
  if (!Array.isArray(raw)) return [];
  const out: RichMark[] = [];
  const seen = new Set<string>();
  for (const m of raw) {
    if (!isObject(m) || typeof m.type !== "string" || seen.has(m.type)) continue;
    if (m.type === "bold" || m.type === "italic") {
      out.push({ type: m.type });
      seen.add(m.type);
    } else if (m.type === "link") {
      const href = safeHref(isObject(m.attrs) ? m.attrs.href : undefined);
      if (href) {
        out.push({ type: "link", attrs: { href } });
        seen.add("link");
      }
    }
    // Any other mark (underline, strike, code, textStyle/colour…) is dropped;
    // its text survives unformatted.
  }
  return out;
}

function normaliseInlines(raw: unknown[], budget: Budget, depth: number): RichInline[] {
  const out: RichInline[] = [];
  for (const n of raw) {
    if (--budget.nodes < 0) break;
    if (!isObject(n)) continue;
    if (n.type === "text") {
      if (typeof n.text !== "string" || n.text.length === 0) continue;
      const marks = normaliseMarks(n.marks);
      const text = n.text.slice(0, MAX_TEXT_LENGTH);
      out.push(marks.length ? { type: "text", text, marks } : { type: "text", text });
    } else if (n.type === "hardBreak") {
      out.push({ type: "hardBreak" });
    } else if (depth < MAX_DEPTH) {
      // An unknown inline wrapper (mention, emoji, an inline image…): keep
      // any text inside it, never the wrapper.
      out.push(...normaliseInlines(childrenOf(n), budget, depth + 1));
    }
  }
  return out;
}

function normaliseListItems(raw: unknown[], budget: Budget, depth: number): RichListItem[] {
  const items: RichListItem[] = [];
  for (const n of raw) {
    if (--budget.nodes < 0) break;
    if (!isObject(n)) continue;
    const blocks = normaliseBlocks(childrenOf(n), budget, depth + 1);
    if (blocks.length) items.push({ type: "listItem", content: blocks });
  }
  return items;
}

function normaliseBlocks(raw: unknown[], budget: Budget, depth: number): RichBlock[] {
  if (depth > MAX_DEPTH) return [];
  const out: RichBlock[] = [];
  for (const n of raw) {
    if (--budget.nodes < 0) break;
    if (!isObject(n)) continue;
    switch (n.type) {
      case "paragraph": {
        const content = normaliseInlines(childrenOf(n), budget, depth + 1);
        out.push(content.length ? { type: "paragraph", content } : { type: "paragraph" });
        break;
      }
      case "heading": {
        // Every heading inside a body is an H3, whatever level was posted.
        const content = normaliseInlines(childrenOf(n), budget, depth + 1);
        if (content.length) out.push({ type: "heading", attrs: { level: 3 }, content });
        break;
      }
      case "bulletList": {
        const content = normaliseListItems(childrenOf(n), budget, depth + 1);
        if (content.length) out.push({ type: "bulletList", content });
        break;
      }
      case "orderedList": {
        const content = normaliseListItems(childrenOf(n), budget, depth + 1);
        if (!content.length) break;
        const rawStart = isObject(n.attrs) ? Number(n.attrs.start) : 1;
        const start = Number.isInteger(rawStart) && rawStart > 1 && rawStart < 10_000 ? rawStart : 1;
        out.push(
          start > 1
            ? { type: "orderedList", attrs: { start }, content }
            : { type: "orderedList", content },
        );
        break;
      }
      case "text":
      case "hardBreak": {
        // Inline content at block level: wrap it rather than lose it.
        const content = normaliseInlines([n], budget, depth + 1);
        if (content.length) out.push({ type: "paragraph", content });
        break;
      }
      default: {
        // blockquote, codeBlock, image, table, iframe, "html"… — unwrap: keep
        // whatever ALLOWED blocks are inside, drop the container itself.
        out.push(...normaliseBlocks(childrenOf(n), budget, depth + 1));
      }
    }
  }
  return out;
}

/** Rebuild any input as an allow-listed document. Never throws. */
export function normaliseRichDoc(input: unknown): RichDoc {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return { type: "doc", content: [] };
    }
  }
  if (!isObject(value)) return { type: "doc", content: [] };
  const budget: Budget = { nodes: MAX_NODES };
  const content = normaliseBlocks(childrenOf(value), budget, 0);
  // Trailing empty paragraphs are editor furniture, not content.
  while (content.length && isEmptyBlock(content[content.length - 1])) content.pop();
  return { type: "doc", content };
}

function isEmptyBlock(b: RichBlock): boolean {
  return b.type === "paragraph" && (!b.content || b.content.length === 0);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type RenderOptions = { internalHosts?: string[] };

function renderInlines(inlines: RichInline[] | undefined, opts: RenderOptions): string {
  if (!inlines) return "";
  return inlines
    .map((n) => {
      if (n.type === "hardBreak") return "<br>";
      let html = escapeHtml(n.text);
      const marks = n.marks ?? [];
      // Fixed nesting order so output is stable: link outermost.
      if (marks.some((m) => m.type === "italic")) html = `<em>${html}</em>`;
      if (marks.some((m) => m.type === "bold")) html = `<strong>${html}</strong>`;
      const link = marks.find((m): m is Extract<RichMark, { type: "link" }> => m.type === "link");
      if (link) {
        const href = safeHref(link.attrs.href);
        if (href) {
          const external = !isInternalHref(href, opts.internalHosts);
          html = external
            ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${html}</a>`
            : `<a href="${escapeHtml(href)}">${html}</a>`;
        }
      }
      return html;
    })
    .join("");
}

function renderBlocks(blocks: RichBlock[], opts: RenderOptions): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "paragraph": {
          const inner = renderInlines(b.content, opts);
          return inner ? `<p>${inner}</p>` : "";
        }
        case "heading":
          return `<h3>${renderInlines(b.content, opts)}</h3>`;
        case "bulletList":
          return `<ul>${b.content.map((li) => `<li>${renderBlocks(li.content, opts)}</li>`).join("")}</ul>`;
        case "orderedList": {
          const start = b.attrs?.start && b.attrs.start > 1 ? ` start="${b.attrs.start}"` : "";
          return `<ol${start}>${b.content.map((li) => `<li>${renderBlocks(li.content, opts)}</li>`).join("")}</ol>`;
        }
      }
    })
    .join("");
}

/**
 * Safe HTML for a section body. Normalises first, so a document read back
 * from the database is held to the same allow-list as one being saved.
 */
export function renderRichDocToHtml(input: unknown, opts: RenderOptions = {}): string {
  return renderBlocks(normaliseRichDoc(input).content, opts);
}

// ---------------------------------------------------------------------------
// Reading helpers (word counts, checklist inputs)
// ---------------------------------------------------------------------------

function inlineText(inlines: RichInline[] | undefined): string {
  if (!inlines) return "";
  return inlines.map((n) => (n.type === "text" ? n.text : " ")).join("");
}

function blocksText(blocks: RichBlock[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "paragraph" || b.type === "heading") out.push(inlineText(b.content));
    else for (const li of b.content) out.push(...blocksText(li.content));
  }
  return out;
}

/** Plain text, one entry per paragraph/heading/list line. */
export function richDocText(input: unknown): string {
  return blocksText(normaliseRichDoc(input).content).join("\n");
}

function collectLinks(blocks: RichBlock[], out: string[]) {
  for (const b of blocks) {
    if (b.type === "paragraph" || b.type === "heading") {
      for (const n of b.content ?? []) {
        if (n.type !== "text") continue;
        for (const m of n.marks ?? []) if (m.type === "link") out.push(m.attrs.href);
      }
    } else {
      for (const li of b.content) collectLinks(li.content, out);
    }
  }
}

/** Every link href in the document, after normalisation. */
export function richDocLinks(input: unknown): string[] {
  const out: string[] = [];
  collectLinks(normaliseRichDoc(input).content, out);
  return out;
}

export function countWords(text: string): number {
  const words = text.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return words ? words.length : 0;
}
