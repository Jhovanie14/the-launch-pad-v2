import { imageMimeFromUrl } from "@/lib/blog/images";
import { rssPosts } from "@/lib/blog/queries";
import { SITE_URL } from "@/lib/blog/site";

/**
 * RSS 2.0 feed of the newest published posts, advertised from /blog's <head>.
 * Published-only by construction: rssPosts filters on `published`.
 */
export const revalidate = 300;

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await rssPosts(30);
  const newest = posts[0]?.updatedAt ?? new Date();

  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const summary = (p.excerpt ?? p.metaDescription ?? "").trim();
      return [
        "    <item>",
        `      <title>${xml(p.title)}</title>`,
        `      <link>${xml(url)}</link>`,
        `      <guid isPermaLink="true">${xml(url)}</guid>`,
        p.publishedAt ? `      <pubDate>${p.publishedAt.toUTCString()}</pubDate>` : null,
        p.categoryName ? `      <category>${xml(p.categoryName)}</category>` : null,
        summary ? `      <description>${xml(summary)}</description>` : null,
        p.coverImage
          ? `      <enclosure url="${xml(p.coverImage)}" type="${imageMimeFromUrl(p.coverImage)}" length="0" />`
          : null,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Launch Pad — Car Care Tips &amp; News</title>
    <link>${xml(`${SITE_URL}/blog`)}</link>
    <description>Practical car care advice from The Launch Pad in Houston.</description>
    <language>en-us</language>
    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>
    <atom:link href="${xml(`${SITE_URL}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
