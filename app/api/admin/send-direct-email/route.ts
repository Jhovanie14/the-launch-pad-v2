import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Resend } from "resend";
import { escapeHtml, isAllowedBannerUrl } from "@/lib/email/escapeHtml";

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

    const htmlContent = buildEmailHtml({ subject, title, body, bannerUrl });

    await resend.emails.send({
      from: "The Launch Pad Wash <noreply@thelaunchpadwash.com>",
      to,
      subject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[send-direct-email]", err?.message);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

function buildEmailHtml({ subject, title, body, bannerUrl }: {
  subject: string;
  title?: string;
  body: string;
  bannerUrl?: string;
}) {
  const year = new Date().getFullYear();
  const paragraphs = body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      // Indent lines that start with bullet-like characters
      if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
        return `<p style="margin:0 0 10px 0;padding-left:16px;color:#475569;">${escapeHtml(trimmed)}</p>`;
      }
      return `<p style="margin:0 0 14px 0;color:#475569;">${escapeHtml(trimmed)}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:36px 32px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;letter-spacing:2px;color:#93c5fd;text-transform:uppercase;">The Launch Pad Wash</p>
              <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">🚀 A Message From Us</p>
            </td>
          </tr>

          <!-- Banner (optional) -->
          ${isAllowedBannerUrl(bannerUrl) ? `
          <tr>
            <td style="padding:0;">
              <img src="${escapeHtml(bannerUrl)}" alt="Banner" style="width:100%;height:auto;display:block;border:none;" />
            </td>
          </tr>` : ""}

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 36px;">

              ${title ? `
              <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#0f172a;line-height:1.3;">${escapeHtml(title)}</h1>
              <div style="width:48px;height:3px;background:linear-gradient(90deg,#2563eb,#60a5fa);border-radius:2px;margin-bottom:28px;"></div>
              ` : `<div style="margin-bottom:28px;"></div>`}

              <div style="font-size:15px;line-height:1.8;">
                ${paragraphs}
              </div>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background-color:#ffffff;padding:0 36px;">
              <div style="border-top:1px solid #e2e8f0;"></div>
            </td>
          </tr>

          <!-- Contact strip -->
          <tr>
            <td style="background-color:#ffffff;padding:24px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:13px;color:#64748b;line-height:1.7;">
                    <p style="margin:0 0 4px 0;font-weight:600;color:#1e293b;">Have questions? We're here to help.</p>
                    <p style="margin:0;">📞 (832) 219-8320 &nbsp;|&nbsp; ✉️ info@thelaunchpadwash.com</p>
                    <p style="margin:0;">📍 10410 S Main St, Houston, TX 77025</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="https://www.thelaunchpadwash.com" style="display:inline-block;padding:10px 22px;background:#1e3a8a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:8px;white-space:nowrap;">
                      Visit Website →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#94a3b8;">© ${year} The Launch Pad Wash. All rights reserved.</p>
              <p style="margin:0;font-size:12px;color:#cbd5e1;">
                <a href="https://www.thelaunchpadwash.com/privacy" style="color:#94a3b8;text-decoration:underline;">Privacy Policy</a>
                &nbsp;•&nbsp;
                <a href="https://www.thelaunchpadwash.com/terms" style="color:#94a3b8;text-decoration:underline;">Terms of Service</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
