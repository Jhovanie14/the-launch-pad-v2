import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";

export async function GET() {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase, createAdminClient());

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        created_at,
        status,
        total_price,
        service_package_name,
        vehicle:vehicles ( year, make, model ),
        booking_add_ons ( add_ons ( id, name, price ) ),
        profiles:user_id ( full_name, email )
      `
      )
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    return apiError(err);
  }
}
