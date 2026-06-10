import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/invadmin";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { randomBytes } from "node:crypto";

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    await requireAdmin(supabase, createAdminClient());

    const { email, full_name } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Create the user WITHOUT a known password; require them to set it via reset.
    const tempPassword = randomBytes(24).toString("base64url");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name,
        role: "admin",
        created_at: new Date().toISOString(),
      });
    }

    // Send a password-reset link so the invited admin sets their own password.
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    return NextResponse.json({
      success: true,
      message: "Admin invited; password setup email sent",
    });
  } catch (err) {
    return apiError(err);
  }
}
