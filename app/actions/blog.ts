"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, requireAdmin } from "@/lib/auth/guards";
import {
  BLOG_BUCKET,
  blogImagePathFromUrl,
  blogImageUrl,
  isBlogUploadPath,
  newBlogImagePath,
  validateBlogImage,
} from "@/lib/blog/images";
import {
  parsePostInput,
  planSave,
  saveErrorFromDb,
  type ExistingPost,
  type SaveFailure,
  type SaveIntent,
} from "@/lib/blog/save";
import { SITE_HOST } from "@/lib/blog/site";
import { isValidSlug, slugify } from "@/lib/blog/slug";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Blog admin actions. Each re-checks the admin role (requireAdmin) and then
 * writes with the service role: blog_posts has no write policies at all
 * (20261007000000_blog_seo.sql), so this file is the only way in.
 */

export type BlogSaveResult = { ok: true; id: string; slug: string; published: boolean } | SaveFailure;
export type BlogActionResult = { ok: true } | { ok: false; error: string };

const NOT_AUTHORISED = { ok: false as const, error: "Not authorised" };

/** The service-role client if the caller is an admin, else null. */
async function adminOrNull() {
  const admin = createAdminClient();
  try {
    await requireAdmin(await createClient(), admin);
    return admin;
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

function revalidateBlog() {
  // "layout" covers every page under /blog: posts, categories, preview, RSS.
  revalidatePath("/blog", "layout");
  revalidatePath("/admin/blog", "layout");
  revalidatePath("/sitemap.xml");
}

/**
 * Save a post — as a draft, or (intent "publish") save and publish in one
 * write, so what goes live is exactly what the editor was looking at.
 */
export async function saveBlogPost(input: unknown, intent: SaveIntent = "save"): Promise<BlogSaveResult> {
  const admin = await adminOrNull();
  if (!admin) return NOT_AUTHORISED;

  const parsed = parsePostInput(input);
  if (!parsed.ok) return parsed;
  const d = parsed.data;

  let existing: ExistingPost | null = null;
  if (d.id) {
    const { data } = await admin
      .from("blog_posts")
      .select("id, slug, published, published_at")
      .eq("id", d.id)
      .maybeSingle();
    if (!data) return { ok: false, error: "That post no longer exists." };
    existing = data;
  }

  let categoryExists = true;
  if (d.categoryId) {
    const { data } = await admin.from("blog_categories").select("id").eq("id", d.categoryId).maybeSingle();
    categoryExists = !!data;
  }

  const plan = planSave({ data: d, intent, existing, categoryExists, now: new Date(), internalHosts: [SITE_HOST] });
  if (!plan.ok) return plan;

  const { data: saved, error } = existing
    ? await admin.from("blog_posts").update(plan.values).eq("id", existing.id).select("id, slug, published").single()
    : await admin.from("blog_posts").insert(plan.values).select("id, slug, published").single();
  if (error) {
    const known = saveErrorFromDb(error);
    if (known) return known;
    throw new Error(`Failed to save blog post: ${error.message}`);
  }

  revalidateBlog();
  return { ok: true, id: saved.id, slug: saved.slug, published: saved.published };
}

/** Take a post off the site. Its slug stays locked (published_at survives). */
export async function unpublishBlogPost(id: string): Promise<BlogActionResult> {
  const admin = await adminOrNull();
  if (!admin) return NOT_AUTHORISED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Post not found" };

  const { data, error } = await admin
    .from("blog_posts")
    .update({ published: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("published", true)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Failed to unpublish: ${error.message}`);
  if (!data) return { ok: false, error: "That post is not published." };
  revalidateBlog();
  return { ok: true };
}

/**
 * Delete a draft that has NEVER been published. A post that has been live
 * keeps its row (unpublish it instead): its URL has been crawled and linked,
 * and keeping the row keeps that slug from being reused.
 */
export async function deleteBlogPost(id: string): Promise<BlogActionResult> {
  const admin = await adminOrNull();
  if (!admin) return NOT_AUTHORISED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Post not found" };

  const { data: deleted, error } = await admin
    .from("blog_posts")
    .delete()
    .eq("id", id)
    .is("published_at", null)
    .select("cover_image")
    .maybeSingle();
  if (error) throw new Error(`Failed to delete: ${error.message}`);
  if (!deleted) return { ok: false, error: "Only drafts that have never been published can be deleted." };

  // Best effort, after the row is gone — the row is the source of truth.
  const path = deleted.cover_image ? blogImagePathFromUrl(deleted.cover_image) : null;
  if (path) {
    const { count } = await admin
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("cover_image", deleted.cover_image);
    if (!count) await admin.storage.from(BLOG_BUCKET).remove([path]);
  }
  revalidateBlog();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cover images
// ---------------------------------------------------------------------------

export type BlogImageTicket = { ok: true; path: string; token: string; url: string } | { ok: false; error: string };

/**
 * Step 1 of a cover upload: validate the claimed type/size and mint a signed
 * upload URL for a fresh path. The browser uploads straight to Storage, so a
 * photo never passes through a Vercel function's 4.5 MB body limit.
 */
export async function requestBlogImageUpload(mime: string, sizeBytes: number): Promise<BlogImageTicket> {
  const admin = await adminOrNull();
  if (!admin) return NOT_AUTHORISED;
  const check = validateBlogImage(String(mime), Number(sizeBytes));
  if (!check.ok) return check;

  const path = newBlogImagePath(check.extension);
  const { data, error } = await admin.storage.from(BLOG_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return {
      ok: false,
      error: /not found/i.test(error?.message ?? "")
        ? "Image storage is not set up yet — run the blog migration."
        : "Couldn't start the upload. Try again.",
    };
  }
  return { ok: true, path, token: data.token, url: blogImageUrl(path) };
}

/** Step 2: re-check what ACTUALLY landed (a signed URL pins neither type nor size). */
export async function confirmBlogImageUpload(path: string): Promise<BlogActionResult> {
  const admin = await adminOrNull();
  if (!admin) return NOT_AUTHORISED;
  if (!isBlogUploadPath(path)) return { ok: false, error: "Upload not recognised." };

  const storage = admin.storage.from(BLOG_BUCKET);
  const { data, error } = await storage.info(path);
  if (error || !data) return { ok: false, error: "Upload not found — please try again." };

  const check = validateBlogImage(data.contentType ?? "", data.size ?? 0);
  if (!check.ok) {
    await storage.remove([path]);
    return check;
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type BlogCategoryFormState = { ok: boolean; fieldErrors?: Record<string, string>; formError?: string };

const categorySchema = z.object({
  name: z.string().trim().min(2, "Give the category a name").max(60),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

function categoryFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createBlogCategory(
  _prev: BlogCategoryFormState,
  formData: FormData,
): Promise<BlogCategoryFormState> {
  const admin = await adminOrNull();
  if (!admin) return { ok: false, formError: "Not authorised" };
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: categoryFieldErrors(parsed.error) };

  const requested = String(formData.get("slug") || "").trim();
  const slug = slugify(requested || parsed.data.name);
  if (!isValidSlug(slug)) return { ok: false, fieldErrors: { slug: "Use letters, numbers and hyphens." } };

  const { error } = await admin.from("blog_categories").insert({
    slug,
    name: parsed.data.name,
    description: parsed.data.description || null,
    sort_order: parsed.data.sortOrder ?? 0,
  });
  if (error?.code === "23505") {
    return { ok: false, fieldErrors: { slug: "A category with this web address already exists." } };
  }
  if (error) throw new Error(`Failed to create category: ${error.message}`);
  revalidateBlog();
  return { ok: true };
}

/** Name, description and order only — the slug is a public URL and stays put. */
export async function updateBlogCategory(
  _prev: BlogCategoryFormState,
  formData: FormData,
): Promise<BlogCategoryFormState> {
  const admin = await adminOrNull();
  if (!admin) return { ok: false, formError: "Not authorised" };
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { ok: false, formError: "Category not found" };
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: categoryFieldErrors(parsed.error) };

  const { data, error } = await admin
    .from("blog_categories")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      sort_order: parsed.data.sortOrder ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id.data)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Failed to update category: ${error.message}`);
  if (!data) return { ok: false, formError: "Category not found" };
  revalidateBlog();
  return { ok: true };
}

/** Only an unused category can go — posts are never silently uncategorised. */
export async function deleteBlogCategory(id: string): Promise<BlogActionResult> {
  const admin = await adminOrNull();
  if (!admin) return NOT_AUTHORISED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Category not found" };

  const { count } = await admin
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (count) return { ok: false, error: "Posts still use this category. Move them to another one first." };

  const { data, error } = await admin.from("blog_categories").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(`Failed to delete category: ${error.message}`);
  if (!data) return { ok: false, error: "Category not found" };
  revalidateBlog();
  return { ok: true };
}
