import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { Resend } from "resend";
import { escapeHtml, isAllowedBannerUrl } from "@/lib/email/escapeHtml";

const resend = new Resend(process.env.RESEND_API_KEY);

// Utility: delay for throttling
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Utility: split array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);
    const { subject, title, body, bannerUrl } = await req.json();

    // Get all active express + self-service subscribers' emails
    const [{ data: expressSubs }, { data: selfSubs }] = await Promise.all([
      admin
        .from("user_subscription")
        .select("profiles(email)")
        .eq("status", "active"),
      admin
        .from("self_service_subscriptions")
        .select("profiles(email)")
        .eq("status", "active"),
    ]);

    const emailSet = new Set<string>();
    (expressSubs ?? []).forEach((s: any) => s.profiles?.email && emailSet.add(s.profiles.email));
    (selfSubs ?? []).forEach((s: any) => s.profiles?.email && emailSet.add(s.profiles.email));

    const subscribers = Array.from(emailSet).map((email) => ({ email }));

    if (subscribers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No active subscribers found.",
      });
    }

    // Prepare HTML content for the email
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(subject) || "Launchpad Wash"}</title>
      <!--[if mso]>
      <style>
        table { border-collapse: collapse; }
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      
      <!-- Email Container -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            
            <!-- Main Content Card -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Banner Image (if exists) -->
              ${
                isAllowedBannerUrl(bannerUrl)
                  ? `
              <tr>
                <td style="padding: 0;">
                  <img src="${escapeHtml(bannerUrl)}" alt="Banner" style="width: 100%; height: auto; display: block; border: none;" />
                </td>
              </tr>
              `
                  : ""
              }
              
              <!-- Content Section -->
              <tr>
                <td style="padding: 40px 32px;">
                  
                  <!-- Logo/Brand (optional) -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                    <tr>
                      <td align="center">
                        <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #1e293b; letter-spacing: 0.5px;">
                          🚀 LAUNCHPAD WASH
                        </h2>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Title -->
                  ${
                    title
                      ? `
                  <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                    ${escapeHtml(title)}
                  </h1>
                  `
                      : ""
                  }
                  
                  <!-- Divider -->
                  <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #2563eb, #3b82f6); border-radius: 2px; margin-bottom: 24px;"></div>
                  
                  <!-- Body Content -->
                  <div style="font-size: 16px; line-height: 1.7; color: #475569; margin-bottom: 32px;">
                    ${body
                      .split("\n")
                      .map((paragraph: any) =>
                        paragraph.trim()
                          ? `<p style="margin: 0 0 16px 0;">${escapeHtml(paragraph.trim())}</p>`
                          : ""
                      )
                      .join("")}
                  </div>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 16px 0;">
                        <a href="https://www.thelaunchpadwash.com" 
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: transform 0.2s;">
                          Book Your Wash Now →
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
              <!-- Footer Section -->
              <tr>
                <td style="background-color: #f8fafc; padding: 32px; border-top: 1px solid #e2e8f0;">
                  
                  <!-- Social Links (optional) -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                    <tr>
                      <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" style="display: inline-block;">
                          <tr>
                            <td style="padding: 0 8px;">
                              <a href="https://www.facebook.com/profile.php?id=61566883617151" style="color: #64748b; text-decoration: none; font-size: 14px;">Facebook</a>
                            </td>
                            <td style="padding: 0 8px; color: #cbd5e1;">|</td>
                            <td style="padding: 0 8px;">
                              <a href="https://instagram.com/thelaunchpadhtx" style="color: #64748b; text-decoration: none; font-size: 14px;">Instagram</a>
                            </td>
                            <td style="padding: 0 8px; color: #cbd5e1;">|</td>
                            <td style="padding: 0 8px;">
                              <a href="#" style="color: #64748b; text-decoration: none; font-size: 14px;">Twitter</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Footer Text -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="font-size: 13px; line-height: 1.6; color: #64748b;">
                        <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} Launchpad Wash. All rights reserved.</p>
                        <p style="margin: 0 0 8px 0;">Premium car wash services in your area.</p>
                        <p style="margin: 0;">
                          <a href="https://www.thelaunchpadwash.com/unsubscribe" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a> • 
                          <a href="https://www.thelaunchpadwash.com/privacy" style="color: #94a3b8; text-decoration: underline;">Privacy Policy</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
            </table>
            
            <!-- Spacer -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; margin-top: 20px;">
              <tr>
                <td align="center" style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  This email was sent to you because you're subscribed to Launchpad Wash updates.
                </td>
              </tr>
            </table>
            
          </td>
        </tr>
      </table>
      
    </body>
    </html>
    `;

    // Split subscribers into batches of 2 (Resend limit: 2 requests/sec)
    const batches = chunkArray(subscribers, 2);

    let sentCount = 0;

    for (const batch of batches) {
      await Promise.all(
        batch.map((user) =>
          resend.emails.send({
            from: "The Launch Pad Wash <noreply@thelaunchpadwash.com>",
            to: user.email,
            subject,
            html: htmlContent,
          })
        )
      );

      sentCount += batch.length;
      // Wait 1 second before sending the next batch
      await delay(1000);
    }

    return NextResponse.json({ success: true, sentTo: sentCount });
  } catch (err) {
    return apiError(err);
  }
}
