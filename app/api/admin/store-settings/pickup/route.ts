import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { sanitizePickupSettings } from "@/lib/products/storeSettings";

/**
 * Save the pickup hours, the pickup note and the unpaid-order hold. Only these columns:
 * the storefront hero has its own route, whose sanitiser nulls every hero
 * field missing from the body.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const settings = sanitizePickupSettings(await req.json());
    const { error } = await admin
      .from("store_settings")
      .update({
        pickup_hours: settings.pickupHours,
        pickup_note: settings.pickupNote,
        hold_days: settings.holdDays,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw error;

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return apiError(err);
  }
}
