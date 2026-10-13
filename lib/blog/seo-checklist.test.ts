import { describe, expect, it } from "vitest";
import type { RichDoc } from "@/lib/blog/rich-text";
import { containsKeyword, seoChecklist, type ChecklistInput } from "@/lib/blog/seo-checklist";

const para = (text: string, href?: string): RichDoc => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        href
          ? { type: "text", text, marks: [{ type: "link", attrs: { href } }] }
          : { type: "text", text },
      ],
    },
  ],
});

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

/** A post that passes every check. Each test breaks one thing. */
function good(): ChecklistInput {
  return {
    title: "Lip filler training: how to choose a course",
    seoTitle: "Lip filler training: choosing a UK course",
    metaDescription:
      "Thinking about lip filler training? Here is how to compare UK courses, check a trainer's insurance and qualifications, and choose with confidence.",
    slug: "lip-filler-training-guide",
    focusKeyword: "lip filler training",
    coverImage: "https://proj.supabase.co/storage/v1/object/public/blog-images/posts/2f1c8a52-8b0c-4b7e-9a51-0d6c2c4b9f10.jpg",
    coverImageAlt: "A trainer demonstrating lip filler technique",
    body: {
      intro: "Lip filler training is the most searched course on the Hub. This guide explains what to look for.",
      sections: [
        { heading: "What lip filler training covers", content: para(words(400), "/search?category=lip-filler") },
        { heading: "Checking a trainer", content: para(words(250)) },
      ],
    },
    faq: [{ question: "How long is a course?", answer: "Usually one day." }],
    cta: { destination: "booking", buttonText: "" },
  };
}

const byId = (input: ChecklistInput, id: string) => seoChecklist(input).items.find((i) => i.id === id)!;

describe("seoChecklist", () => {
  it("passes a complete, well-optimised post", () => {
    const result = seoChecklist(good());
    expect(result.canPublish).toBe(true);
    expect(result.items.filter((i) => i.status !== "pass").map((i) => i.id)).toEqual([]);
  });

  describe("required fields block publishing", () => {
    it.each([
      ["title", (p: ChecklistInput) => ({ ...p, title: " " })],
      ["slug", (p: ChecklistInput) => ({ ...p, slug: "" })],
      ["meta-present", (p: ChecklistInput) => ({ ...p, metaDescription: "" })],
      ["cover", (p: ChecklistInput) => ({ ...p, coverImage: null })],
      ["cover", (p: ChecklistInput) => ({ ...p, coverImageAlt: "  " })],
      ["intro", (p: ChecklistInput) => ({ ...p, body: { ...p.body, intro: "" } })],
      ["sections", (p: ChecklistInput) => ({ ...p, body: { ...p.body, sections: [] } })],
      [
        "sections",
        (p: ChecklistInput) => ({
          ...p,
          body: { ...p.body, sections: [{ heading: "Empty", content: { type: "doc", content: [] } }] },
        }),
      ],
    ])("%s", (id, breakIt) => {
      const result = seoChecklist(breakIt(good()) as ChecklistInput);
      expect(result.canPublish).toBe(false);
      expect(result.blockers.map((b) => b.id)).toContain(id);
      expect(result.items.find((i) => i.id === id)?.status).toBe("fail");
    });
  });

  describe("advisory checks warn but never block", () => {
    it("SEO title over 60 characters", () => {
      const input = { ...good(), seoTitle: `Lip filler training ${"x".repeat(50)}` };
      expect(byId(input, "seo-title-length").status).toBe("warn");
      expect(seoChecklist(input).canPublish).toBe(true);
    });

    it("falls back to the post title when there is no SEO title", () => {
      const input = { ...good(), seoTitle: "" };
      expect(seoChecklist(input).effectiveSeoTitle).toBe(good().title);
      expect(byId(input, "keyword-seo-title").status).toBe("pass");
    });

    it("meta description outside 120–158 characters", () => {
      expect(byId({ ...good(), metaDescription: "Lip filler training, briefly." }, "meta-length").status).toBe("warn");
      expect(byId({ ...good(), metaDescription: `lip filler training ${"x".repeat(150)}` }, "meta-length").status).toBe(
        "warn",
      );
      expect(byId({ ...good(), metaDescription: "x".repeat(120) }, "meta-length").status).toBe("pass");
      expect(byId({ ...good(), metaDescription: "x".repeat(158) }, "meta-length").status).toBe("pass");
    });

    it("keyword missing from title, SEO title, first paragraph, every heading, meta and slug", () => {
      const input = { ...good(), focusKeyword: "chemical peels" };
      for (const id of [
        "keyword-title",
        "keyword-seo-title",
        "keyword-intro",
        "keyword-heading",
        "keyword-meta",
        "keyword-slug",
      ]) {
        expect(byId(input, id).status, id).toBe("warn");
      }
      expect(seoChecklist(input).canPublish).toBe(true);
    });

    it("only the FIRST paragraph of the intro counts for the keyword", () => {
      const input = {
        ...good(),
        body: { ...good().body, intro: "An opening with no keyword.\n\nLip filler training appears here." },
      };
      expect(byId(input, "keyword-intro").status).toBe("warn");
    });

    it("no focus keyword set", () => {
      const result = seoChecklist({ ...good(), focusKeyword: "" });
      expect(result.items.find((i) => i.id === "keyword")?.status).toBe("warn");
      expect(result.items.some((i) => i.id === "keyword-title")).toBe(false);
      expect(result.canPublish).toBe(true);
    });

    it("fewer than 600 words", () => {
      const input = {
        ...good(),
        body: { ...good().body, sections: [{ heading: "Lip filler training", content: para("short") }] },
      };
      expect(byId(input, "word-count").status).toBe("warn");
      expect(seoChecklist(input).canPublish).toBe(true);
    });

    it("no internal link and no CTA", () => {
      const input = {
        ...good(),
        cta: null,
        body: { ...good().body, sections: [{ heading: "Lip filler training", content: para(words(700), "https://www.nhs.uk") }] },
      };
      expect(byId(input, "internal-link").status).toBe("warn");
      expect(byId({ ...input, cta: good().cta }, "internal-link").status).toBe("pass");
    });

    it("a section without a heading", () => {
      const input = {
        ...good(),
        body: { ...good().body, sections: [...good().body.sections, { heading: "", content: para("more") }] },
      };
      expect(byId(input, "section-headings").status).toBe("warn");
      expect(seoChecklist(input).canPublish).toBe(true);
    });
  });
});

describe("containsKeyword", () => {
  it("matches whole phrases case-insensitively, ignoring punctuation", () => {
    expect(containsKeyword("Lip-Filler Training: a guide", "lip filler training")).toBe(true);
    expect(containsKeyword("Best LIP FILLER TRAINING in Leeds", "lip filler training")).toBe(true);
  });

  it("does not match a different word that merely contains the keyword", () => {
    expect(containsKeyword("lip fillers", "lip filler")).toBe(false);
    expect(containsKeyword("anything", "")).toBe(false);
  });
});

describe("locked slugs", () => {
  it("passes the web address item for a locked legacy slug", () => {
    const input = { ...good(), slug: "Old_Post Title-", slugLocked: true };
    expect(byId(input, "slug").status).toBe("pass");
    expect(seoChecklist(input).canPublish).toBe(true);
  });

  it("still fails an invalid slug that is not locked", () => {
    expect(byId({ ...good(), slug: "Old_Post Title-" }, "slug").status).toBe("fail");
  });
});
