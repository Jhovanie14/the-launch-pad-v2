import { describe, expect, it } from "vitest";
import { HERO_LIMITS, sanitizeHeroSettings } from "./storefront";

describe("sanitizeHeroSettings", () => {
  it("keeps the five hero fields and trims them", () => {
    expect(
      sanitizeHeroSettings({
        hero_video_url: " https://cdn/x.mp4 ",
        hero_poster_url: " https://cdn/x.jpg ",
        hero_headline: "  Pro Series Car Care  ",
        hero_subcopy: " Built for the finish. ",
        hero_cta_label: " Explore the range ",
      }),
    ).toEqual({
      hero_video_url: "https://cdn/x.mp4",
      hero_poster_url: "https://cdn/x.jpg",
      hero_headline: "Pro Series Car Care",
      hero_subcopy: "Built for the finish.",
      hero_cta_label: "Explore the range",
    });
  });

  it("turns blank values into null, so the page falls back to its defaults", () => {
    const out = sanitizeHeroSettings({
      hero_headline: "",
      hero_subcopy: "   ",
      hero_cta_label: null,
      hero_video_url: undefined,
      hero_poster_url: "",
    });
    expect(out).toEqual({
      hero_video_url: null,
      hero_poster_url: null,
      hero_headline: null,
      hero_subcopy: null,
      hero_cta_label: null,
    });
  });

  it("ignores any key that is not a hero field", () => {
    const out = sanitizeHeroSettings({
      hero_headline: "Hi",
      delivery_fee: 999,
      id: 2,
      role: "admin",
    } as Record<string, unknown>);
    expect(Object.keys(out).sort()).toEqual([
      "hero_cta_label",
      "hero_headline",
      "hero_poster_url",
      "hero_subcopy",
      "hero_video_url",
    ]);
  });

  it("drops non-string values rather than writing them through", () => {
    const out = sanitizeHeroSettings({ hero_headline: 42 } as Record<string, unknown>);
    expect(out.hero_headline).toBeNull();
  });

  it("truncates text past its limit so the hero layout cannot be broken from admin", () => {
    const long = "x".repeat(HERO_LIMITS.hero_headline + 50);
    const out = sanitizeHeroSettings({ hero_headline: long });
    expect(out.hero_headline).toHaveLength(HERO_LIMITS.hero_headline);
  });
});
