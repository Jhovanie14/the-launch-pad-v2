import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { createClient as createServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1️⃣ Check if the current user is logged in and an admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, user_type")
    .eq("id", user?.id)
    .single();

  if (
    !profile ||
    (profile.user_type !== "admin" && profile.user_type !== "super_admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 2️⃣ Parse request body
  const { email, full_name } = await req.json();

  // 3️⃣ Create a new user using the service role
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "launchpad2024!",
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 4️⃣ Ensure profile record exists with admin role
  if (data.user) {
    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name,
      role: "admin",
      user_type: "admin",
      created_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    message: "Admin invited successfully",
  });
}
