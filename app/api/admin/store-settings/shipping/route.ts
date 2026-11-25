import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { sanitizeShippingSettings } from "@/lib/shipping/settings";

/** Save the pouches staff pack into and the states we don't ship to. Only these columns. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const settings = sanitizeShippingSettings(await req.json());
    const { error } = await admin
      .from("store_settings")
      .update({
        shipping_pouches: settings.pouches,
        shipping_excluded_states: settings.excludedStates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw error;

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return apiError(err);
  }
}
