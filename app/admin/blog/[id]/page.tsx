import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogEditor } from "@/components/admin/blog/blog-editor";
import { adminCategories, adminPost } from "@/lib/blog/admin-queries";
import { isSlugLocked } from "@/lib/blog/slug";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit blog post — Admin" };

type Props = { params: Promise<{ id: string }> };

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const post = await adminPost(id);
  if (!post) notFound();
  const categories = await adminCategories();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <Link href="/admin/blog" className="text-sm text-muted-foreground hover:text-foreground">
        ← All posts
      </Link>
      <h1 className="mt-3 text-3xl font-bold">{post.title}</h1>
      <div className="mt-8">
        <BlogEditor
          // Remount on every save that changes the stored copy, so the editor
          // starts from what was actually saved (normalised), not stale state.
          key={post.updatedAt.toISOString()}
          initial={{
            id: post.id,
            title: post.title,
            seoTitle: post.seoTitle ?? "",
            metaDescription: post.metaDescription ?? "",
            focusKeyword: post.focusKeyword ?? "",
            excerpt: post.excerpt ?? "",
            slug: post.slug,
            coverImage: post.coverImage,
            coverImageAlt: post.coverImageAlt ?? "",
            categoryId: post.categoryId ?? "",
            author: post.author,
            body: post.body,
            faq: post.faq,
            cta: post.cta,
            published: post.published,
            slugLocked: isSlugLocked(post),
          }}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </main>
  );
}
