import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  sendProductOrderDeliveredEmail,
  sendProductOrderShippedEmail,
} from "@/lib/email/product-order-emails";
import { shippoConfigured, shippoFromEnv } from "@/lib/shipping/shippo";
import { handleShippoEvent } from "@/lib/shipping/webhook";

/** Constant-time compare of the ?token= against SHIPPO_WEBHOOK_SECRET. */
function tokenOk(token: string | null): boolean {
  const secret = process.env.SHIPPO_WEBHOOK_SECRET;
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Shippo webhooks (transaction_created, transaction_updated, track_updated),
 * registered in Shippo as /api/webhooks/shippo?token=<SHIPPO_WEBHOOK_SECRET>.
 * Shippo doesn't sign webhooks, so the handler re-fetches every object with our
 * key before changing an order. A handler error returns 500 so Shippo retries.
 */
export async function POST(req: Request) {
  if (!tokenOk(new URL(req.url).searchParams.get("token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!shippoConfigured()) return NextResponse.json({ ok: true, outcome: "not configured" });

  const event = await req.json().catch(() => null);
  try {
    const outcome = await handleShippoEvent(
      {
        db: createAdminClient(),
        shippo: shippoFromEnv(),
        emails: { shipped: sendProductOrderShippedEmail, delivered: sendProductOrderDeliveredEmail },
      },
      event ?? {},
    );
    console.log("[shippo webhook]", event?.event, outcome);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[shippo webhook] failed:", event?.event, err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
