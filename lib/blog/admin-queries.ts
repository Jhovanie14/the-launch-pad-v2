import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { FULL_COLUMNS, toPost, type BlogPostFull, type FullRow } from "./rows";

/**
 * Admin blog reads (drafts included). Each function re-checks the admin role
 * itself — a layout guard is not enough when a module can be imported from
 * anywhere — and then reads with the service role, which RLS does not filter.
 * Throws AuthError for anyone else.
 */
async function adminDb() {
  const admin = createAdminClient();
  await requireAdmin(await createClient(), admin);
  return admin;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminBlogRow = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  categoryName: string | null;
};

type AdminRowRaw = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  published_at: string | null;
  updated_at: string;
  category: { name: string } | { name: string }[] | null;
};

export async function adminPosts(): Promise<AdminBlogRow[]> {
  const db = await adminDb();
  const { data, error } = await db
    .from("blog_posts")
    .select("id, slug, title, published, published_at, updated_at, category:blog_categories(name)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load blog posts: ${error.message}`);
  return (data as unknown as AdminRowRaw[]).map((r) => {
    const category = Array.isArray(r.category) ? r.category[0] : r.category;
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      published: r.published,
      publishedAt: r.published_at ? new Date(r.published_at) : null,
      updatedAt: new Date(r.updated_at),
      categoryName: category?.name ?? null,
    };
  });
}

/** Any status — the editor and the admin-only preview. */
export async function adminPost(id: string): Promise<BlogPostFull | null> {
  const db = await adminDb();
  if (!UUID.test(id)) return null;
  const { data, error } = await db.from("blog_posts").select(FULL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load blog post: ${error.message}`);
  return data ? toPost(data as unknown as FullRow) : null;
}

export type AdminBlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  postCount: number;
};

export async function adminCategories(): Promise<AdminBlogCategory[]> {
  const db = await adminDb();
  const { data, error } = await db
    .from("blog_categories")
    .select("id, slug, name, description, sort_order, blog_posts(count)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load blog categories: ${error.message}`);
  return (
    data as unknown as {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      sort_order: number;
      blog_posts: { count: number }[];
    }[]
  ).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    sortOrder: c.sort_order,
    postCount: c.blog_posts[0]?.count ?? 0,
  }));
}
