import { describe, expect, it } from "vitest";
import { parsePostInput, planSave, saveErrorFromDb, type ExistingPost, type PostInput } from "@/lib/blog/save";

const SUPA = "https://proj.supabase.co";
const COVER = `${SUPA}/storage/v1/object/public/blog-images/posts/2f1c8a52-8b0c-4b7e-9a51-0d6c2c4b9f10.jpg`;
const NOW = new Date("2026-10-07T15:00:00Z");

const section = (heading: string, text: string) => ({
  heading,
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
});

/** Everything the publishing bar needs. */
function complete(): Record<string, unknown> {
  return {
    title: "How often should you wash your car in Houston?",
    seoTitle: "",
    metaDescription: "Sun, pollen and road grime: how often a Houston car really needs washing, and when to add wax.",
    focusKeyword: "car wash houston",
    excerpt: "",
    slug: "",
    coverImage: COVER,
    coverImageAlt: "A freshly washed sedan in a self-service bay",
    categoryId: null,
    author: "",
    body: { intro: "Houston is hard on paint.", sections: [section("Why it matters", "Pollen and heat.")] },
    faq: [],
    cta: { destination: "booking", buttonText: "" },
  };
}

function plan(input: Record<string, unknown>, opts: Partial<Parameters<typeof planSave>[0]> = {}) {
  const parsed = parsePostInput(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return planSave({
    data: parsed.data as PostInput,
    intent: "save",
    existing: null,
    categoryExists: true,
    now: NOW,
    internalHosts: ["www.thelaunchpadwash.com"],
    supabaseUrl: SUPA,
    ...opts,
  });
}

const live: ExistingPost = { id: "11111111-1111-4111-8111-111111111111", slug: "old-post", published: true, published_at: "2026-01-01T00:00:00Z" };

describe("parsePostInput", () => {
  it("needs a title", () => {
    const result = parsePostInput({ ...complete(), title: "  " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.title).toBeTruthy();
  });
});

describe("planSave", () => {
  it("saves a half-written draft without checking the publishing bar", () => {
    const result = plan({ title: "Just a title" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values).toMatchObject({ slug: "just-a-title", published: false, published_at: null, author: "The Launch Pad" });
    }
  });

  it("refuses to publish with blockers listed", () => {
    const result = plan({ ...complete(), metaDescription: "" }, { intent: "publish" });
    expect(result).toMatchObject({ ok: false, blockers: ["Meta description"] });
  });

  it("sets published_at on first publish", () => {
    const result = plan(complete(), { intent: "publish" });
    expect(result.ok && result.values).toMatchObject({ published: true, published_at: NOW.toISOString() });
  });

  it("keeps the first publication date when republishing", () => {
    const unpublished = { ...live, published: false };
    const result = plan({ ...complete(), slug: "old-post" }, { intent: "publish", existing: unpublished });
    expect(result.ok && result.values.published_at).toBe("2026-01-01T00:00:00Z");
  });

  it("holds a save of a live post to the publishing bar", () => {
    // A converted legacy post: body but no meta description or alt text.
    const result = plan({ ...complete(), slug: "old-post", metaDescription: "", coverImageAlt: "" }, { existing: live });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/This post is live/);
      expect(result.blockers).toEqual(["Meta description", "Cover image with alt text"]);
    }
  });

  it("keeps a live post live when saved", () => {
    const result = plan({ ...complete(), slug: "old-post" }, { existing: live });
    expect(result.ok && result.values).toMatchObject({ published: true, slug: "old-post" });
  });

  it("refuses to move a locked slug", () => {
    const result = plan({ ...complete(), slug: "new-address" }, { existing: live });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.fieldErrors?.slug).toBeTruthy();
  });

  it("refuses a cover that is not in the blog bucket", () => {
    const result = plan({ ...complete(), coverImage: "https://evil.example/x.jpg" });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.fieldErrors?.coverImage).toBeTruthy();
  });

  it("refuses a category that no longer exists", () => {
    const result = plan({ ...complete(), categoryId: "22222222-2222-4222-8222-222222222222" }, { categoryExists: false });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.fieldErrors?.categoryId).toBeTruthy();
  });

  it("stores nulls for empty optional fields and normalised jsonb", () => {
    const result = plan({ ...complete(), faq: [{ question: "Q?", answer: "" }], cta: { destination: "bogus" } });
    expect(result.ok && result.values).toMatchObject({ seo_title: null, excerpt: null, faq: [], cta: null });
  });
});

describe("saveErrorFromDb", () => {
  it("turns a unique violation into a slug error", () => {
    expect(saveErrorFromDb({ code: "23505" })).toMatchObject({ ok: false, fieldErrors: { slug: expect.any(String) } });
    expect(saveErrorFromDb({ code: "42P01" })).toBeNull();
    expect(saveErrorFromDb(null)).toBeNull();
  });
});
