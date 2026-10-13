import { describe, expect, it } from "vitest";
import {
  normaliseRichDoc,
  renderRichDocToHtml,
  richDocLinks,
  richDocText,
  safeHref,
} from "@/lib/blog/rich-text";

/**
 * The renderer is the only thing standing between what an admin's browser
 * posts and the HTML every visitor receives — so it is tested as an
 * allow-list: what is NOT listed must not come out, whatever it is called.
 */

const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]) => ({ type: "text", text, ...(marks && { marks }) });
const link = (href: string) => ({ type: "link", attrs: { href } });

describe("renderRichDocToHtml — allowed formatting", () => {
  it("renders paragraphs, bold, italic, H3 and both list types", () => {
    const html = renderRichDocToHtml(
      doc(
        p(t("Plain "), t("bold", [{ type: "bold" }]), t(" and "), t("italic", [{ type: "italic" }])),
        { type: "heading", attrs: { level: 3 }, content: [t("A sub-heading")] },
        { type: "bulletList", content: [{ type: "listItem", content: [p(t("one"))] }] },
        { type: "orderedList", content: [{ type: "listItem", content: [p(t("first"))] }] },
      ),
    );
    expect(html).toBe(
      "<p>Plain <strong>bold</strong> and <em>italic</em></p>" +
        "<h3>A sub-heading</h3>" +
        "<ul><li><p>one</p></li></ul>" +
        "<ol><li><p>first</p></li></ol>",
    );
  });

  it("renders internal links plainly and external links with rel=noopener", () => {
    const html = renderRichDocToHtml(
      doc(p(t("search", [link("/search?category=foundation")]), t(" "), t("NHS", [link("https://www.nhs.uk/")]))),
    );
    expect(html).toContain('<a href="/search?category=foundation">search</a>');
    expect(html).toContain('<a href="https://www.nhs.uk/" rel="noopener noreferrer" target="_blank">NHS</a>');
  });

  it("treats absolute links to our own host as internal", () => {
    const html = renderRichDocToHtml(doc(p(t("x", [link("https://www.aesthetictraininghub.co.uk/blog")]))), {
      internalHosts: ["aesthetictraininghub.co.uk"],
    });
    expect(html).not.toContain("target=");
  });
});

describe("renderRichDocToHtml — everything else is stripped", () => {
  it("escapes markup typed as text", () => {
    const html = renderRichDocToHtml(doc(p(t('<script>alert(1)</script><img src=x onerror="alert(1)">'))));
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("drops script, style, iframe and raw-html nodes", () => {
    const html = renderRichDocToHtml(
      doc(
        { type: "script", content: [t("alert(1)")] },
        { type: "style", text: "body{display:none}" },
        { type: "iframe", attrs: { src: "https://evil.example" } },
        { type: "html", html: "<b onclick='x()'>hi</b>" },
        p(t("kept")),
      ),
    );
    expect(html).not.toMatch(/<script|<style|<iframe|onclick|<b[ >]/i);
    expect(html).toContain("<p>kept</p>");
  });

  it("never emits attributes it was not built to emit (no on* handlers, no style, no class)", () => {
    const html = renderRichDocToHtml(
      doc({
        type: "paragraph",
        attrs: { onclick: "alert(1)", style: "color:red", class: "x" },
        content: [{ type: "text", text: "hi", attrs: { onmouseover: "alert(1)" }, marks: [{ type: "bold", attrs: { onclick: "x" } }] }],
      }),
    );
    expect(html).toBe("<p><strong>hi</strong></p>");
  });

  it("strips javascript:, data: and vbscript: links but keeps the text", () => {
    for (const href of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      " javascript:alert(1)",
      "java\nscript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "//evil.example/path",
      "/\\evil.example",
    ]) {
      const html = renderRichDocToHtml(doc(p(t("click", [link(href)]))));
      expect(html, href).toBe("<p>click</p>");
    }
  });

  it("escapes quotes in hrefs so they cannot break out of the attribute", () => {
    const html = renderRichDocToHtml(doc(p(t("x", [link('/a"onmouseover="alert(1)')]))));
    expect(html).not.toContain('"onmouseover');
    expect(html).toContain("&quot;");
  });

  it("downgrades H1/H2 in a body to H3 — the template owns those levels", () => {
    const html = renderRichDocToHtml(
      doc(
        { type: "heading", attrs: { level: 1 }, content: [t("Big")] },
        { type: "heading", attrs: { level: 2 }, content: [t("Medium")] },
      ),
    );
    expect(html).toBe("<h3>Big</h3><h3>Medium</h3>");
  });

  it("drops colour / underline / code marks but keeps their text", () => {
    const html = renderRichDocToHtml(
      doc(p(t("tinted", [{ type: "textStyle", attrs: { color: "red" } }, { type: "underline" }, { type: "code" }]))),
    );
    expect(html).toBe("<p>tinted</p>");
  });

  it("unwraps unknown containers, keeping their allowed content", () => {
    const html = renderRichDocToHtml(doc({ type: "blockquote", content: [p(t("quoted"))] }));
    expect(html).toBe("<p>quoted</p>");
  });

  it("survives malformed input without throwing", () => {
    for (const bad of [null, undefined, 42, "not json", "{}", [], { type: "doc", content: "x" }]) {
      expect(() => renderRichDocToHtml(bad)).not.toThrow();
      expect(renderRichDocToHtml(bad)).toBe("");
    }
  });

  it("bounds recursion on deeply nested lists", () => {
    let node: unknown = p(t("deep"));
    for (let i = 0; i < 200; i++) node = { type: "bulletList", content: [{ type: "listItem", content: [node] }] };
    expect(() => renderRichDocToHtml(doc(node))).not.toThrow();
  });
});

describe("safeHref", () => {
  it("accepts site paths, anchors, http(s), mailto and tel", () => {
    expect(safeHref("/search")).toBe("/search");
    expect(safeHref("#faq")).toBe("#faq");
    expect(safeHref("https://www.nhs.uk")).toBe("https://www.nhs.uk/");
    expect(safeHref("mailto:hello@example.com")).toBe("mailto:hello@example.com");
    expect(safeHref("tel:+441234567890")).toBe("tel:+441234567890");
  });

  it("upgrades a bare www. address to https", () => {
    expect(safeHref("www.jccp.org.uk")).toBe("https://www.jccp.org.uk/");
  });
});

describe("normaliseRichDoc + readers", () => {
  it("removes trailing empty paragraphs the editor leaves behind", () => {
    expect(normaliseRichDoc(doc(p(t("x")), { type: "paragraph" }, { type: "paragraph" })).content).toHaveLength(1);
  });

  it("reads text and links back out of the document", () => {
    const d = doc(p(t("Hello "), t("world", [link("/search")])));
    expect(richDocText(d)).toBe("Hello world");
    expect(richDocLinks(d)).toEqual(["/search"]);
  });

  it("accepts the document as a JSON string", () => {
    expect(renderRichDocToHtml(JSON.stringify(doc(p(t("x")))))).toBe("<p>x</p>");
  });
});
