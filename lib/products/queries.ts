import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ProductRow, StoreSettingsRow } from "@/types/db";

/**
 * Server-side reads for the public storefront.
 *
 * Deliberately NOT utils/supabase/server.ts: that client reads cookies, and
 * touching cookies opts a route into dynamic rendering. The catalog is the same
 * for every visitor and its RLS policy already allows anonymous reads of active
 * products, so an anon client lets /products be prerendered and revalidated
 * instead of re-queried on every request.
 */
function storefrontClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Active products in curated order. Returns [] rather than throwing. */
export async function getActiveProducts(): Promise<ProductRow[]> {
  const { data, error } = await storefrontClient()
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load products:", error);
    return [];
  }
  return data ?? [];
}

/** One active product by slug, or null when it does not exist or is hidden. */
export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const { data, error } = await storefrontClient()
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load product "${slug}":`, error);
    return null;
  }
  return data;
}

/** The single-row store config, or null if it has not been seeded. */
export async function getStoreSettings(): Promise<StoreSettingsRow | null> {
  const { data, error } = await storefrontClient()
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load store settings:", error);
    return null;
  }
  return data;
}
