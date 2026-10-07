import Link from "next/link";
import { CategoryRow, NewCategoryForm } from "@/components/admin/blog/category-manager";
import { adminCategories } from "@/lib/blog/admin-queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog categories — Admin" };

export default async function AdminBlogCategoriesPage() {
  const categories = await adminCategories();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <Link href="/admin/blog" className="text-sm text-muted-foreground hover:text-foreground">
        ← All posts
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Blog categories</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        A handful of broad topics works best — five or six, not twenty. Each one with a published post gets its own
        page on the blog, so give it a description that says who it is for.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Categories">
          {categories.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No categories yet. Add your first one to start sorting posts.
            </p>
          ) : (
            <ul className="rounded-xl border bg-card px-6 shadow-sm">
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </ul>
          )}
        </section>
        <NewCategoryForm />
      </div>
    </main>
  );
}
