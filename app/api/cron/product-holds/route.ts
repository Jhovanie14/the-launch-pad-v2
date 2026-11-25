import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { runHoldJob } from "@/lib/products/holds";
import { getPickupSettings } from "@/lib/products/storeSettings";
import {
  sendProductOrderHoldReminderEmail,
  sendProductOrderReleasedEmail,
  sendProductOrderShippedEmail,
} from "@/lib/email/product-order-emails";
import { pushOrderToShippo } from "@/lib/shipping/pushOrder";
import { shippoConfigured, shippoFromEnv } from "@/lib/shipping/shippo";
import { syncShippedFromShippo } from "@/lib/shipping/syncShipped";

/**
 * Daily (vercel.json crons, about 9 AM Houston): remind customers whose
 * pay-at-store hold ends tomorrow, and release holds that have ended. Then
 * retry Shippo pushes and check Shippo for labels bought without a webhook.
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
    // Shipping orders: retry pushes that failed, and catch labels bought in
    // Shippo whose webhook never arrived.
    const shipping = { pushed: 0, shipped: 0 };
    if (shippoConfigured()) {
      const shippo = shippoFromEnv();
      const { data: waiting } = await db
        .from("product_orders")
        .select("id, shippo_order_id")
        .eq("fulfillment_method", "delivery")
        .eq("payment_status", "paid")
        .eq("fulfilment_status", "placed")
        .limit(20);
      for (const o of waiting ?? []) {
        try {
          if (!o.shippo_order_id) {
            if ((await pushOrderToShippo({ db, shippo }, o.id)).ok) shipping.pushed++;
          } else if ((await syncShippedFromShippo({ db, shippo, sendShipped: sendProductOrderShippedEmail }, o.id)) === "shipped") {
            shipping.shipped++;
          }
        } catch (err) {
          console.error("[cron/product-holds] shipping step failed for", o.id, err);
        }
      }
    }
    return NextResponse.json({ ...result, shipping });
  } catch (err) {
    console.error("[cron/product-holds] failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
