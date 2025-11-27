import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// GET - Fetch all fleet inquiries
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin (implement your own admin check)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: Add admin role check here
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single();
    // if (profile?.role !== 'admin') {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { data, error } = await supabase
      .from("fleet_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fleet inquiries fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inquiries" },
      { status: 500 }
    );
  }
}

// PATCH - Update inquiry status
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    const { data, error } = await supabase
      .from("fleet_inquiries")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Fleet inquiry update error:", error);
    return NextResponse.json(
      { error: "Failed to update inquiry" },
      { status: 500 }
    );
  }
}
