import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getResend, syncContactToResend } from "@/lib/marketing/resendContacts";
import { resyncUnsynced } from "@/lib/marketing/resync";

/**
 * Daily (vercel.json crons): retries marketing consent changes that did not
 * reach Resend at the time. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resyncUnsynced(createAdminClient(), (c) =>
      syncContactToResend(getResend(), process.env.RESEND_MARKETING_TOPIC_ID, c),
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/marketing-sync] failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
