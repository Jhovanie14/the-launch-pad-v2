import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getConsentStatus, recordConsent } from "@/lib/marketing/consent";
import {
  getResend,
  getTopicSubscription,
  syncContactToResend,
} from "@/lib/marketing/resendContacts";
import { decideFromContactEvent } from "@/lib/marketing/resendWebhook";

/**
 * Resend webhook: brings unsubscribes (and re-subscribes made on Resend's
 * preferences page) back into marketing_consents. Every request must carry a
 * valid Resend (Svix) signature. Handled events always return 200 so Resend
 * does not retry them forever; failures are logged.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const payload = await req.text();
  let event: ReturnType<ReturnType<typeof getResend>["webhooks"]["verify"]>;
  try {
    event = getResend().webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "contact.updated" && event.type !== "contact.deleted") {
    return NextResponse.json({ received: true });
  }

  try {
    const email = event.data.email;
    const admin = createAdminClient();
    const topicId = process.env.RESEND_MARKETING_TOPIC_ID;
    const resend = getResend();

    const current = await getConsentStatus(admin, email);
    const topic =
      event.type === "contact.updated" && topicId
        ? await getTopicSubscription(resend, topicId, email)
        : null;

    const decision = decideFromContactEvent(
      { type: event.type, data: { email, unsubscribed: event.data.unsubscribed } },
      topic,
      current,
    );
    if (decision) {
      const result = await recordConsent(admin, { email, ...decision });
      // A blocked customer re-subscribing in Resend stays out: push it back.
      if (result.outcome === "skipped_blocked") {
        await syncContactToResend(resend, topicId, { email, subscribed: false });
      }
    }
  } catch (err) {
    console.error("[resend-webhook] failed to apply contact event:", err);
  }

  return NextResponse.json({ received: true });
}
