import type { Metadata } from "next";

export const SITE_NAME = "The Launch Pad";

/**
 * The shared social card: `public/og-image.png`, 1200x630 and fully opaque.
 *
 * Both properties matter. The old card declared 1200x630 while the file was
 * actually 1024x1024, and crawlers lay the preview out from the declared size —
 * so the image arrived letterboxed or was dropped. It was also a transparent
 * PNG, which platforms composite over their own background, usually black.
 */
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "The Launch Pad — car wash and express detailing in Houston, TX",
};

type SocialCard = {
  /** Page title, without the site name — this adds it. */
  title: string;
  description: string;
  /** Root-relative path, resolved against metadataBase. */
  path: string;
};

/**
 * Build a complete Open Graph object for one route.
 *
 * Next merges metadata shallowly: a child declaring `openGraph` REPLACES the
 * parent's object rather than merging into it. Returning the whole thing here
 * is what stops a per-page title from silently dropping the image, site name
 * and locale along with it.
 */
export function openGraph({
  title,
  description,
  path,
}: SocialCard): Metadata["openGraph"] {
  return {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: path,
    // A card is often seen with no surrounding context, so it carries the
    // brand the same way the <title> template does.
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [OG_IMAGE],
  };
}

/** Twitter cards replace the parent object too, so build the whole one. */
export function twitter({
  title,
  description,
}: Omit<SocialCard, "path">): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description,
    images: [OG_IMAGE.url],
  };
}
