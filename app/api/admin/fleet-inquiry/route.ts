import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("fleet_inquiries")
      .insert({
        user_id: body.user_id,
        company_name: body.company_name,
        contact_name: body.contact_name,
        email: body.email,
        phone: body.phone,
        fleet_size: body.fleet_size,
        message: body.message,
      })
      .select()
      .single();

    if (error) throw error;

    // Optional: Send email notification to your team
    // await sendFleetInquiryNotification(data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Fleet inquiry error:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}
