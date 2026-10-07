/**
 * Structured data for a blog post: Article, BreadcrumbList and (when the post
 * has FAQs) FAQPage. Pure builders, so the shapes are unit-tested rather than
 * eyeballed in a page.
 *
 * Scoped to the blog. The publisher is a self-contained Organization node, so
 * it never depends on site-wide markup elsewhere.
 */
import { DEFAULT_AUTHOR, type BlogFaq } from "./post";
import { SITE_URL } from "./site";

export const PUBLISHER_NAME = "The Launch Pad";

/**
 * Serialise for a <script type="application/ld+json"> body. `<` is escaped so
 * a post title containing "</script>" cannot close the tag — the page renders
 * this with dangerouslySetInnerHTML, and these strings are editor input.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function articleJsonLd(args: {
  url: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  datePublished: Date;
  dateModified: Date;
  authorName: string;
  section: string | null;
  keyword: string | null;
}) {
  const author =
    args.authorName.trim() && args.authorName.trim() !== DEFAULT_AUTHOR
      ? { "@type": "Person", name: args.authorName.trim() }
      : { "@type": "Organization", name: PUBLISHER_NAME, url: SITE_URL };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    // Google truncates headline at 110 characters.
    headline: args.headline.slice(0, 110),
    description: args.description,
    ...(args.imageUrl && { image: [args.imageUrl] }),
    datePublished: args.datePublished.toISOString(),
    dateModified: args.dateModified.toISOString(),
    author,
    publisher: {
      "@type": "Organization",
      name: PUBLISHER_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/launchpad-logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": args.url },
    url: args.url,
    inLanguage: "en-US",
    ...(args.section && { articleSection: args.section }),
    ...(args.keyword && { keywords: args.keyword }),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Null when there are no FAQs — an empty FAQPage is invalid markup. */
export function faqJsonLd(faq: BlogFaq[]) {
  if (faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
