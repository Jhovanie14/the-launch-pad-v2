import Link from "next/link";
import { BlogEditor } from "@/components/admin/blog/blog-editor";
import { adminCategories } from "@/lib/blog/admin-queries";
import { DEFAULT_AUTHOR } from "@/lib/blog/post";

export const dynamic = "force-dynamic";
export const metadata = { title: "New blog post — Admin" };

/** Nothing is written until the first save; that save creates the row. */
export default async function NewBlogPostPage() {
  const categories = await adminCategories();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <Link href="/admin/blog" className="text-sm text-muted-foreground hover:text-foreground">
        ← All posts
      </Link>
      <h1 className="mt-3 text-3xl font-bold">New post</h1>
      <div className="mt-8">
        <BlogEditor
          initial={{
            title: "",
            seoTitle: "",
            metaDescription: "",
            focusKeyword: "",
            excerpt: "",
            slug: "",
            coverImage: null,
            coverImageAlt: "",
            categoryId: "",
            author: DEFAULT_AUTHOR,
            body: { intro: "", sections: [] },
            faq: [],
            cta: null,
            published: false,
            slugLocked: false,
          }}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </main>
  );
}
