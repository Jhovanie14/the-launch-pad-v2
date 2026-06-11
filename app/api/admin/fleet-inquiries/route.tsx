import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { NextResponse } from "next/server";

// GET - Fetch all fleet inquiries
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase, createAdminClient());

    const { data, error } = await supabase
      .from("fleet_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}

// PATCH - Update inquiry status
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase, createAdminClient());

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
    return apiError(error);
  }
}
