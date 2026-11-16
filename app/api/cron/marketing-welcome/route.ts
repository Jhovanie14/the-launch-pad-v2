import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { houstonToday } from "@/lib/admin/bookingQuery";
import { SITE_URL } from "@/lib/email/layout";
import { getResend } from "@/lib/marketing/resendContacts";
import { sendMarketingBatch, type MarketingResendLike } from "@/lib/marketing/sendMarketingBatch";
import { buildWelcomeEmail, findWelcomeRecipients } from "@/lib/marketing/welcome";

/**
 * Daily (vercel.json crons, 16:00 UTC = 10am Houston in winter, 11am in
 * summer): the welcome email for yesterday's first-time opt-ins. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`. Sends nothing until
 * MARKETING_UNSUBSCRIBE_SECRET is set (every email needs a working
 * unsubscribe link). `?dryRun=1` only counts who would get it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unsubscribeSecret = process.env.MARKETING_UNSUBSCRIBE_SECRET;
  if (!unsubscribeSecret) {
    return NextResponse.json({ skipped: "MARKETING_UNSUBSCRIBE_SECRET is not set" });
  }

  try {
    const today = houstonToday();
    const recipients = await findWelcomeRecipients(createAdminClient(), today);
    const summary = { today, recipients: recipients.length };

    if (new URL(req.url).searchParams.get("dryRun") === "1") {
      return NextResponse.json({ ...summary, dryRun: true });
    }

    const result = await sendMarketingBatch(getResend() as unknown as MarketingResendLike, recipients, {
      secret: unsubscribeSecret,
      siteUrl: SITE_URL,
      today,
      keyPrefix: "welcome",
      build: (r, unsubscribeUrl) => buildWelcomeEmail({ firstName: r.firstName, unsubscribeUrl }),
    });
    return NextResponse.json({ ...summary, ...result });
  } catch (err) {
    console.error("[cron/marketing-welcome] failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
