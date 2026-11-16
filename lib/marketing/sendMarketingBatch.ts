/**
 * Sends one automatic marketing email per recipient through Resend
 * `batch.send`, 100 per call (Resend's batch limit). Every email carries the
 * recipient's own unsubscribe link and one-click `List-Unsubscribe` headers.
 * Each chunk's idempotency key is `<keyPrefix>/<today>/<chunk>`, so a retried
 * cron run on the same day sends nothing twice.
 *
 * Used by win-back, the membership nudge and the welcome email.
 */
import { FROM } from "@/lib/email/layout";
import { createUnsubscribeToken, unsubscribeUrl } from "./unsubscribeToken";

const BATCH_SIZE = 100;

/**
 * Most emails one automatic email (win-back, nudge, welcome) sends in a day.
 * Resend's free plan allows 100 a day IN TOTAL, shared with booking
 * confirmations, tip emails and receipts; three automatic emails at 20 each
 * leave room for those. Anyone over the limit is skipped for that day (the
 * emails are stateless, so they don't carry over) and logged.
 */
export const MARKETING_DAILY_LIMIT = 20;

/** The slice of the Resend SDK this module uses; tests pass fakes. */
export interface MarketingResendLike {
  batch: {
    send(
      emails: { from: string; to: string; subject: string; html: string; headers: Record<string, string> }[],
      options: { idempotencyKey: string },
    ): Promise<{ data: unknown; error: unknown }>;
  };
}

export async function sendMarketingBatch<R extends { email: string }>(
  resend: MarketingResendLike,
  recipients: R[],
  opts: {
    secret: string;
    siteUrl: string;
    today: string;
    keyPrefix: string;
    build: (r: R, unsubscribeUrl: string) => { subject: string; html: string };
  },
): Promise<{ sent: number; failed: number; heldBack: number }> {
  let sent = 0;
  let failed = 0;
  const heldBack = Math.max(0, recipients.length - MARKETING_DAILY_LIMIT);
  if (heldBack > 0) {
    console.warn(`[marketing] ${opts.keyPrefix}: daily limit ${MARKETING_DAILY_LIMIT} reached, ${heldBack} not sent today`);
  }
  const toSend = recipients.slice(0, MARKETING_DAILY_LIMIT);
  for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
    const chunk = toSend.slice(i, i + BATCH_SIZE);
    const emails = chunk.map((r) => {
      const oneClick = `${opts.siteUrl}/api/marketing/unsubscribe?t=${createUnsubscribeToken(r.email, opts.secret)}`;
      const { subject, html } = opts.build(r, unsubscribeUrl(r.email, opts.secret, opts.siteUrl));
      return {
        from: FROM,
        to: r.email,
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${oneClick}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });
    try {
      const { error } = await resend.batch.send(emails, {
        idempotencyKey: `${opts.keyPrefix}/${opts.today}/${i / BATCH_SIZE}`,
      });
      if (error) {
        console.error(`[marketing] ${opts.keyPrefix} batch failed:`, error);
        failed += chunk.length;
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      console.error(`[marketing] ${opts.keyPrefix} batch threw:`, err);
      failed += chunk.length;
    }
  }
  return { sent, failed, heldBack };
}
