import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { Resend } from "resend";
import { buildBroadcastEmailHtml } from "@/lib/email/admin-message-email";
import { FROM } from "@/lib/email/layout";

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

    // Admin-written content in the shared branded layout (escaped, banner
    // URL allow-listed). No unsubscribe link: there is no unsubscribe flow
    // for this list yet (see docs/superpowers/specs/2026-11-05-marketing-consent-design.md).
    const htmlContent = buildBroadcastEmailHtml({ subject, title, body, bannerUrl });

    // Split subscribers into batches of 2 (Resend limit: 2 requests/sec)
    const batches = chunkArray(subscribers, 2);

    let sentCount = 0;

    for (const batch of batches) {
      await Promise.all(
        batch.map((user) =>
          resend.emails.send({
            from: FROM,
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
