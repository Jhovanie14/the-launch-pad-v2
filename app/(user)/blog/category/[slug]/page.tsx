import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogListing } from "@/components/blog/blog-listing";
import { Breadcrumbs } from "@/components/blog/breadcrumbs";
import { pageFromParam } from "@/lib/blog/post";
import { categoryBySlug, publicCategories, publishedPostsPage } from "@/lib/blog/queries";
import { openGraph, twitter } from "@/lib/seo/openGraph";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

function describe(category: { name: string; description: string | null }): string {
  return (
    category.description?.trim() ||
    `${category.name}: car care guides and advice from The Launch Pad, Houston's self-service, express detailing and membership car wash.`
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await categoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false, follow: false } };
  const page = pageFromParam((await searchParams).page);
  const base = `/blog/category/${category.slug}`;
  const path = page > 1 ? `${base}?page=${page}` : base;
  const title = page > 1 ? `${category.name} — Page ${page}` : `${category.name} — Car Care Blog`;
  const description = describe(category);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: openGraph({ title, description, path }),
    twitter: twitter({ title, description }),
  };
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await categoryBySlug(slug);
  if (!category) notFound();

  const page = pageFromParam((await searchParams).page);
  const { posts, pageCount } = await publishedPostsPage({ page, categoryId: category.id });
  // A category with nothing published (or a page past its end) is not worth indexing.
  if (posts.length === 0) notFound();
  const categories = await publicCategories();

  return (
    <BlogListing
      eyebrow="Car care blog"
      title={category.name}
      intro={describe(category)}
      posts={posts}
      page={page}
      pageCount={pageCount}
      basePath={`/blog/category/${category.slug}`}
      categories={categories}
      activeCategorySlug={category.slug}
      breadcrumb={<Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: category.name }]} />}
    />
  );
}
