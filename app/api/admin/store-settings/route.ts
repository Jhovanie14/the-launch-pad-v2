import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { sanitizeHeroSettings } from "@/lib/products/storefront";

/**
 * Save the storefront hero — the film, poster and copy /products opens with.
 *
 * Written here with the service-role client rather than from the browser. The
 * "Admins can update store settings" policy gates on a subquery against
 * profiles, which is itself subject to that table's RLS; the same pattern is
 * what made media uploads fail with "new row violates row-level security
 * policy". Authorising in the route with requireAdmin avoids depending on it.
 *
 * sanitizeHeroSettings discards every key that is not a hero field, so this
 * cannot be used to write delivery_fee or anything else on the row.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const body = (await req.json()) as Record<string, unknown>;
    const hero = sanitizeHeroSettings(body);

    const { error } = await admin
      .from("store_settings")
      .update({ ...hero, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;

    return NextResponse.json({ ok: true, hero });
  } catch (err) {
    return apiError(err);
  }
}
