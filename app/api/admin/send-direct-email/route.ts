import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Resend } from "resend";
import { buildDirectEmailHtml } from "@/lib/email/admin-message-email";
import { FROM } from "@/lib/email/layout";
import { apiError } from "@/lib/http/apiError";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { to, subject, title, body, bannerUrl } = await req.json();
    if (!to || !subject || !body) {
      return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 });
    }

    const htmlContent = buildDirectEmailHtml({ subject, title, body, bannerUrl });

    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[send-direct-email]", err?.message);
    return apiError(err);
  }
}
