import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/client";
import { Resend } from "resend";

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
    const supabase = createClient();
    const { subject, title, body, bannerUrl } = await req.json();

    // Get all subscribed users
    const { data: subscribers, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("subscribed", true);

    if (error) throw error;
    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No subscribers found.",
      });
    }

    // Prepare HTML content for the email
    const htmlContent = `
      <div style="font-family: sans-serif; line-height: 1.5; max-width: 600px; margin: auto;">
        ${bannerUrl ? `<img src="${bannerUrl}" alt="Banner" style="width:100%; border-radius:8px; margin-bottom:16px;" />` : ""}
        ${title ? `<h1 style="font-size: 24px; margin-bottom: 12px;">${title}</h1>` : ""}
        <p style="font-size: 16px; margin-bottom: 16px;">${body}</p>
        <a href="https://www.thelaunchpadwash.com" style="color: #2563eb; text-decoration: none;">Book Now</a>
      </div>
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
    console.error(err);
    return NextResponse.json({ success: false, error: (err as Error).message });
  }
}
