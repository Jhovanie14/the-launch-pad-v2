import { describe, expect, it } from "vitest";
import { isSlugLocked, isValidSlug, resolveSlugForSave, slugify } from "@/lib/blog/slug";

describe("slugify", () => {
  it("lowercases, hyphenates and strips punctuation", () => {
    expect(slugify("Lip Filler: A Beginner’s Guide")).toBe("lip-filler-a-beginners-guide");
    expect(slugify("  How to choose   a course?! ")).toBe("how-to-choose-a-course");
  });

  it("strips accents and spells out ampersands", () => {
    expect(slugify("Peels & Microneedling — Café Edition")).toBe("peels-and-microneedling-cafe-edition");
  });

  it("caps length at a word boundary", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    expect(isValidSlug(slug)).toBe(true);
  });

  it("produces nothing from a title with no letters or numbers", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("accepts only lowercase words joined by single hyphens", () => {
    expect(isValidSlug("lip-filler-training")).toBe(true);
    expect(isValidSlug("Lip-Filler")).toBe(false);
    expect(isValidSlug("lip--filler")).toBe(false);
    expect(isValidSlug("-lip")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("slug lock rule", () => {
  const draft = { slug: "old-draft", publishedAt: null };
  const published = { slug: "live-post", publishedAt: new Date("2026-10-01T09:00:00Z") };

  it("locks once a post has ever been published", () => {
    expect(isSlugLocked(draft)).toBe(false);
    expect(isSlugLocked(published)).toBe(true);
  });

  it("lets a draft change its slug", () => {
    expect(resolveSlugForSave({ requested: "New Slug", title: "x", existing: draft })).toEqual({
      ok: true,
      slug: "new-slug",
    });
  });

  it("generates a slug from the title when none is given", () => {
    expect(resolveSlugForSave({ requested: "", title: "Choosing a Course", existing: null })).toEqual({
      ok: true,
      slug: "choosing-a-course",
    });
  });

  it("refuses to change a published post's slug", () => {
    const result = resolveSlugForSave({ requested: "something-else", title: "x", existing: published });
    expect(result.ok).toBe(false);
  });

  it("keeps a published post's slug when the same or no slug is posted", () => {
    expect(resolveSlugForSave({ requested: "live-post", title: "x", existing: published })).toEqual({
      ok: true,
      slug: "live-post",
    });
    expect(resolveSlugForSave({ requested: undefined, title: "A new title", existing: published })).toEqual({
      ok: true,
      slug: "live-post",
    });
  });

  it("stays locked after an unpublish (published_at survives, status does not matter)", () => {
    const unpublished = { ...published, status: "draft" };
    expect(resolveSlugForSave({ requested: "moved", title: "x", existing: unpublished }).ok).toBe(false);
  });

  it("refuses slugs that the blog's own routes use", () => {
    expect(resolveSlugForSave({ requested: "preview", title: "x", existing: null }).ok).toBe(false);
    expect(resolveSlugForSave({ requested: "category", title: "x", existing: null }).ok).toBe(false);
  });

  it("refuses an empty result", () => {
    expect(resolveSlugForSave({ requested: "", title: "???", existing: null }).ok).toBe(false);
  });
});

describe("legacy slugs on locked posts", () => {
  // Pre-template posts had hand-typed slugs; once live they cannot change,
  // so they must round-trip unchanged even when they are not canonical.
  const legacy = { slug: "Old_Post Title-", publishedAt: "2025-01-01T00:00:00Z" };

  it("keeps a non-canonical locked slug when the same value is posted back", () => {
    expect(resolveSlugForSave({ requested: "Old_Post Title-", title: "x", existing: legacy })).toEqual({
      ok: true,
      slug: "Old_Post Title-",
    });
  });

  it("still refuses a different value", () => {
    expect(resolveSlugForSave({ requested: "old-post-title", title: "x", existing: legacy }).ok).toBe(false);
  });
});
