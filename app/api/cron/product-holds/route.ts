import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { runHoldJob } from "@/lib/products/holds";
import { getPickupSettings } from "@/lib/products/storeSettings";
import {
  sendProductOrderHoldReminderEmail,
  sendProductOrderReleasedEmail,
} from "@/lib/email/product-order-emails";

/**
 * Daily (vercel.json crons, about 9 AM Houston): remind customers whose
 * pay-at-store hold ends tomorrow, and release holds that have ended.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const { pickupHours, pickupNote } = await getPickupSettings(db);
    const result = await runHoldJob({
      db,
      now: new Date(),
      pickupHours,
      pickupNote,
      emails: { reminder: sendProductOrderHoldReminderEmail, released: sendProductOrderReleasedEmail },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/product-holds] failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
