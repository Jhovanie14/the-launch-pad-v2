import { describe, expect, it } from "vitest";
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
