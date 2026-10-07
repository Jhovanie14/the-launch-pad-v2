import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-article";
import { AuthError } from "@/lib/auth/guards";
import { adminPost } from "@/lib/blog/admin-queries";

/**
 * Admin-only preview of any post, draft or live, in the real public layout.
 *
 * It lives under /blog rather than /admin so it gets the public header,
 * footer and typography. Middleware does not gate /blog, so the guard is
 * here: adminPost() runs requireAdmin, and anyone else gets the same 404 as a
 * missing post — the URL advertises nothing. Never indexed, never in the
 * sitemap, no structured data.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function BlogPreviewPage({ params }: Props) {
  const { id } = await params;
  let post;
  try {
    post = await adminPost(id);
  } catch (e) {
    if (e instanceof AuthError) notFound();
    throw e;
  }
  if (!post) notFound();

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-sm text-foreground">
            <span className="font-medium">
              {post.published ? "Preview of a live post." : "Draft preview — only admins can see this."}
            </span>{" "}
            {post.published ? "This is the last saved version." : "Readers will see it once you publish."}
          </p>
          <Link href={`/admin/blog/${post.id}`} className="text-sm font-medium text-blue-900 underline underline-offset-4">
            Back to editor
          </Link>
        </div>
      </div>
      <BlogArticle post={post} related={[]} structuredData={false} />
    </>
  );
}
