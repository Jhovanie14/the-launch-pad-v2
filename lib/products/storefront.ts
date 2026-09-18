// Storefront hero settings: the film, poster and copy the /products page opens
// with. They live on the single store_settings row rather than on a product,
// because the hero belongs to the shop.
//
// Pure, so the admin route stays thin and the rules are testable: only these
// five fields are ever written, blanks become null (the page falls back to its
// own defaults), and text is capped so a long paste cannot break the layout.

export const HERO_LIMITS = {
  hero_video_url: 2048,
  hero_poster_url: 2048,
  hero_headline: 80,
  hero_subcopy: 300,
  hero_cta_label: 40,
} as const;

export type HeroField = keyof typeof HERO_LIMITS;

export const HERO_FIELDS = Object.keys(HERO_LIMITS) as HeroField[];

export type HeroSettings = Record<HeroField, string | null>;

/**
 * Take only the hero fields from an untrusted object, trimmed and capped.
 * Anything else the caller sent — delivery_fee, id, role — is discarded, so
 * this cannot become a general-purpose write to store_settings.
 */
export function sanitizeHeroSettings(input: Record<string, unknown>): HeroSettings {
  const out = {} as HeroSettings;
  for (const field of HERO_FIELDS) {
    const value = input[field];
    if (typeof value !== "string") {
      out[field] = null;
      continue;
    }
    const trimmed = value.trim();
    out[field] = trimmed === "" ? null : trimmed.slice(0, HERO_LIMITS[field]);
  }
  return out;
}
