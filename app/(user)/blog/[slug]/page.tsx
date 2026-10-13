import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import { postSummary } from "@/lib/blog/post";
import { publishedPostBySlug, publishedSlugs, relatedPosts } from "@/lib/blog/queries";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo/openGraph";

// Cached and refreshed every 5 minutes; every save/publish/unpublish also
// revalidates the (user)/blog layout immediately (lib/blog/revalidate.ts), so an unpublished post
// 404s straight away rather than at the next interval.
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await publishedSlugs()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // publishedPostBySlug is React-cached, so the page's own call is free.
  const post = await publishedPostBySlug(slug);
  // Must not inherit the homepage's description and get indexed as a duplicate.
  if (!post) return { title: "Post not found", robots: { index: false, follow: false } };

  const path = `/blog/${post.slug}`;
  // `absolute`, not the root "%s | The Launch Pad" template: the SEO checklist
  // counts the characters of exactly this string.
  const title = post.seoTitle?.trim() || post.title;
  const description = post.metaDescription?.trim() || postSummary(post);
  const images = post.coverImage ? [{ url: post.coverImage, alt: post.coverImageAlt ?? post.title }] : [OG_IMAGE];

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title,
      description,
      publishedTime: (post.publishedAt ?? post.updatedAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author],
      ...(post.categoryName && { section: post.categoryName }),
      ...(post.focusKeyword && { tags: [post.focusKeyword] }),
      images,
    },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await publishedPostBySlug(slug);
  // Renders the branded 404 with a real 404 status.
  if (!post) notFound();
  const related = await relatedPosts({ id: post.id, categoryId: post.categoryId });
  return <BlogArticle post={post} related={related} />;
}
