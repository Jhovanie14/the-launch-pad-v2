import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogListing } from "@/components/blog/blog-listing";
import { pageFromParam } from "@/lib/blog/post";
import { publicCategories, publishedPostsPage } from "@/lib/blog/queries";
import { openGraph, twitter } from "@/lib/seo/openGraph";

const TITLE = "Car Care Tips & News";
const DESCRIPTION =
  "Practical car care advice from The Launch Pad in Houston - washing technique, protecting your paint, and getting the most out of a wash membership.";

type Props = { searchParams: Promise<{ page?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = pageFromParam((await searchParams).page);
  const path = page > 1 ? `/blog?page=${page}` : "/blog";
  const title = page > 1 ? `${TITLE} — Page ${page}` : TITLE;
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: path, types: { "application/rss+xml": "/blog/rss.xml" } },
    openGraph: openGraph({ title, description: DESCRIPTION, path }),
    twitter: twitter({ title, description: DESCRIPTION }),
  };
}

export default async function BlogIndexPage({ searchParams }: Props) {
  const page = pageFromParam((await searchParams).page);
  const { posts, pageCount } = await publishedPostsPage({ page });
  // Past the last page: a real 404, not an empty page Google could index.
  if (page > 1 && posts.length === 0) notFound();
  const categories = await publicCategories();

  return (
    <BlogListing
      eyebrow="The Launch Pad blog"
      title={TITLE}
      intro="Straight answers on keeping a car clean in Houston — washing technique, protecting paint from the sun, and getting the most out of every visit."
      posts={posts}
      page={page}
      pageCount={pageCount}
      basePath="/blog"
      categories={categories}
    />
  );
}
