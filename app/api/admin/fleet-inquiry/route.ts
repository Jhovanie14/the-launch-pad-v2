import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Fleet inquiry from the signed-in pricing page (/dashboard/pricing).
 *
 * It used to accept anyone, trust a user_id from the request, store fields of
 * any length and send the saved row back. Now: sign-in required, the account
 * comes from the session, fields are capped like the contact form, three a day
 * per account, and the reply says only whether it worked.
 */
const inquiry = z.object({
  company_name: z.string().trim().min(1, "Please enter your company name").max(120),
  contact_name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(254),
  phone: z.string().trim().max(40).optional().default(""),
  fleet_size: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().max(5000).optional().default(""),
});

const DAILY_LIMIT = 3;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to send a fleet inquiry." }, { status: 401 });
    }

    const parsed = inquiry.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Please check the form." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("fleet_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: "We have your inquiry and will be in touch shortly." },
        { status: 429 }
      );
    }

    const { error } = await admin.from("fleet_inquiries").insert({
      user_id: user.id,
      ...parsed.data,
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fleet inquiry error:", error);
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}
