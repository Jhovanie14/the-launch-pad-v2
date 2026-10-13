import Link from "next/link";
import { Newspaper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminPosts, type AdminBlogRow } from "@/lib/blog/admin-queries";
import { formatPostDate } from "@/lib/blog/post";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog — Admin" };

const GROUPS = [
  {
    key: "published",
    label: "Published",
    meaning: "Live on the site, in the sitemap and in search results.",
    match: (p: AdminBlogRow) => p.published,
  },
  {
    key: "drafts",
    label: "Drafts",
    meaning: "Only admins can see these. Use Preview to read one as a visitor would.",
    match: (p: AdminBlogRow) => !p.published,
  },
] as const;

function PostRow({ post }: { post: AdminBlogRow }) {
  const wasLive = !post.published && post.publishedAt !== null;
  return (
    <li className="flex flex-col gap-4 border-t py-5 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold">
          <Link href={`/admin/blog/${post.id}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span className="break-all">{`/blog/${post.slug}`}</span>
          <span aria-hidden>·</span>
          <span>{post.categoryName ?? "No category"}</span>
          <span aria-hidden>·</span>
          <span>
            {post.published && post.publishedAt
              ? `Published ${formatPostDate(post.publishedAt)}`
              : `Edited ${formatPostDate(post.updatedAt)}`}
          </span>
          {wasLive && (
            <>
              <span aria-hidden>·</span>
              <span className="text-amber-700">Unpublished</span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/blog/${post.id}`}>Edit</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link
            href={post.published ? `/blog/${post.slug}` : `/blog/preview/${post.id}`}
            target="_blank"
            rel="noreferrer"
          >
            {post.published ? "View" : "Preview"}
          </Link>
        </Button>
      </div>
    </li>
  );
}

export default async function AdminBlogPage() {
  const posts = await adminPosts();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold">Blog</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Write car care guides that bring Houston drivers to the site from Google. Every post follows the same
            template, and the checklist beside the editor says when it is ready.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/blog/categories">Categories</Link>
          </Button>
          <Button asChild className="bg-blue-900 text-white hover:bg-blue-800">
            <Link href="/admin/blog/new">
              <Plus className="size-4" aria-hidden /> New post
            </Link>
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-xl border border-dashed p-12 text-center">
          <Newspaper className="size-6 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-semibold">No posts yet</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Start with the question customers ask you most. The template takes you through the rest.
          </p>
          <Button asChild className="mt-5 bg-blue-900 text-white hover:bg-blue-800">
            <Link href="/admin/blog/new">Write the first post</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-12">
          {GROUPS.map((group) => {
            const rows = posts.filter(group.match);
            if (rows.length === 0) return null;
            return (
              <section key={group.key}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {`${group.label} · ${rows.length}`}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{group.meaning}</p>
                <ul className="mt-4 rounded-xl border bg-card px-6 shadow-sm">
                  {rows.map((post) => (
                    <PostRow key={post.id} post={post} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
