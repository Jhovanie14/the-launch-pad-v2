import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

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
      .in("status", ["confirmed", "completed"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching revenue breakdown:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
