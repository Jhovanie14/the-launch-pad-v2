import { describe, expect, it } from "vitest";
import { legacyFirstPassBody } from "@/lib/blog/post";
import { toCard, toPost, type FullRow } from "@/lib/blog/rows";

const row: FullRow = {
  id: "p1",
  slug: "a-post",
  title: "A post",
  excerpt: null,
  meta_description: "Meta",
  cover_image: null,
  cover_image_alt: null,
  published_at: "2026-10-01T09:00:00Z",
  updated_at: "2026-10-02T09:00:00Z",
  category: { slug: "tips", name: "Tips" },
  seo_title: null,
  focus_keyword: null,
  category_id: "c1",
  author: "The Launch Pad",
  body: { intro: "Hi", sections: [{ heading: "H", content: { type: "doc", content: [{ type: "iframe" }] } }] },
  faq: [{ question: "Q", answer: "" }],
  cta: { destination: "nowhere", buttonText: "" },
  published: true,
  created_at: "2026-09-30T09:00:00Z",
  content: null,
};

describe("toCard", () => {
  it("maps snake_case to the card view and parses dates", () => {
    const card = toCard(row);
    expect(card).toMatchObject({ slug: "a-post", metaDescription: "Meta", categorySlug: "tips", categoryName: "Tips" });
    expect(card.publishedAt?.toISOString()).toBe("2026-10-01T09:00:00.000Z");
    expect(card.updatedAt).toBeInstanceOf(Date);
  });

  it("accepts the category embed as an array or null", () => {
    expect(toCard({ ...row, category: [{ slug: "x", name: "X" }] }).categorySlug).toBe("x");
    expect(toCard({ ...row, category: null })).toMatchObject({ categorySlug: null, categoryName: null });
    expect(toCard({ ...row, published_at: null }).publishedAt).toBeNull();
  });
});

describe("toPost", () => {
  it("re-normalises body, faq and cta read from the database", () => {
    const post = toPost(row);
    expect(post.body.sections[0].content).toEqual({ type: "doc", content: [] });
    expect(post.faq).toEqual([]);
    expect(post.cta).toBeNull();
    expect(post.createdAt).toBeInstanceOf(Date);
  });
});

describe("toPost with pre-template content", () => {
  const legacy = "Opening line.\nBugs Become More Common During Summer\nSummer is bug season.\nWash them off early.";

  it("lays out an untouched converted post from its original text", () => {
    const post = toPost({ ...row, title: "Bugs", content: legacy, body: legacyFirstPassBody(legacy) });
    expect(post.body.intro).toBe("Opening line.");
    expect(post.body.sections.map((s) => s.heading)).toEqual(["Bugs Become More Common During Summer"]);
  });

  it("keeps a body someone has edited, even when original text exists", () => {
    const edited = { intro: "Rewritten.", sections: [] };
    expect(toPost({ ...row, content: legacy, body: edited }).body).toEqual(edited);
  });
});
