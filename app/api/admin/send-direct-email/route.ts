import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Resend } from "resend";
import { buildDirectEmailHtml, parseDirectEmailRequest } from "@/lib/email/admin-message-email";
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

    const parsed = parseDirectEmailRequest(await req.json().catch(() => null));
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { to, subject, title, body, bannerUrl } = parsed.value;

    const htmlContent = buildDirectEmailHtml({ subject, title, body, bannerUrl });

    // Resend reports a refused email (bad address, daily limit) in `error`
    // rather than by throwing, so it has to be checked here; otherwise staff
    // are told the email went when it did not.
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: htmlContent,
    });
    if (error) {
      console.error("[send-direct-email] Resend refused:", error.message);
      return NextResponse.json(
        { error: `The email was not sent: ${error.message}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[send-direct-email]", err?.message);
    return apiError(err);
  }
}
