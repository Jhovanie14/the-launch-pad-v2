/**
 * Win-back: a "we miss you" email to opted-in customers whose last completed
 * wash was exactly WINBACK_AFTER_DAYS ago. Runs once a day from
 * /api/cron/marketing-winback.
 *
 * Stateless on purpose: looking at one calendar day means each lapse gets one
 * email (if they come back and lapse again, they get one again 30 days
 * later), with no send log to keep. A missed cron day is simply skipped.
 * Same-day retries are deduplicated by Resend idempotency keys.
 *
 * Never emailed: anyone who booked again since (any status but cancelled),
 * members with an active plan, and anyone not opted in to news & offers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/admin/bookingQuery";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import { SITE_URL, button, emailLayout, heading, salutation, signoff, paragraph, text } from "@/lib/email/layout";
import { getConsentStatus } from "./consent";
import { findMemberAccounts } from "./members";
import { sendMarketingBatch, type MarketingResendLike } from "./sendMarketingBatch";

export const WINBACK_AFTER_DAYS = 30;

export interface WinbackRecipient {
  email: string;
  firstName: string | null;
}

export function winbackVisitDate(today: string): string {
  return addDays(today, -WINBACK_AFTER_DAYS);
}

type VisitRow = { customer_email: string | null; customer_name: string | null; user_id: string | null };

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || null;

export async function findWinbackRecipients(
  db: SupabaseClient,
  today: string,
  deps: { isOptedIn?: (email: string) => Promise<boolean> } = {},
): Promise<WinbackRecipient[]> {
  const isOptedIn =
    deps.isOptedIn ?? (async (email: string) => (await getConsentStatus(db, email)) === "subscribed");
  const visitDate = winbackVisitDate(today);

  const { data: visitRows, error: visitError } = await db
    .from("bookings")
    .select("customer_email, customer_name, user_id")
    .eq("status", "completed")
    .eq("appointment_date", visitDate);
  if (visitError) throw visitError;

  // One entry per inbox, keeping the first name we see.
  const byEmail = new Map<string, { email: string; name: string | null; userIds: Set<string> }>();
  for (const v of (visitRows ?? []) as VisitRow[]) {
    const email = v.customer_email?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    const entry = byEmail.get(key) ?? { email, name: null, userIds: new Set<string>() };
    entry.name ??= v.customer_name;
    if (v.user_id) entry.userIds.add(v.user_id);
    byEmail.set(key, entry);
  }
  if (byEmail.size === 0) return [];

  const emails = [...byEmail.values()].map((e) => e.email);
  const userIds = [...new Set([...byEmail.values()].flatMap((e) => [...e.userIds]))];

  // Came back since: a later booking under the same email or account.
  const later = (col: "customer_email" | "user_id", values: string[]) =>
    values.length === 0
      ? Promise.resolve({ data: [] as VisitRow[], error: null })
      : db
          .from("bookings")
          .select("customer_email, user_id")
          .gt("appointment_date", visitDate)
          .neq("status", "cancelled")
          .in(col, values);

  // Members: found by the booking's account or by a profile with that email.
  const [byEmailLater, byUserLater, isMember] = await Promise.all([
    later("customer_email", emails),
    later("user_id", userIds),
    findMemberAccounts(db, emails, userIds),
  ]);
  for (const r of [byEmailLater, byUserLater]) if (r.error) throw r.error;

  const returnedEmails = new Set(
    ((byEmailLater.data ?? []) as VisitRow[]).map((r) => r.customer_email?.toLowerCase()).filter(Boolean),
  );
  const returnedUsers = new Set(((byUserLater.data ?? []) as VisitRow[]).map((r) => r.user_id).filter(Boolean));

  const recipients: WinbackRecipient[] = [];
  for (const [key, entry] of byEmail) {
    if (returnedEmails.has(key)) continue;
    if ([...entry.userIds].some((id) => returnedUsers.has(id))) continue;
    if (isMember(entry.email, entry.userIds)) continue;
    if (!(await isOptedIn(entry.email))) continue;
    recipients.push({ email: entry.email, firstName: firstName(entry.name) });
  }
  return recipients;
}

export function buildWinbackEmail(r: { firstName: string | null; unsubscribeUrl: string }): {
  subject: string;
  html: string;
} {
  const subject = "We look forward to your next visit";
  const promo = FIRST_SUBSCRIPTION_PROMO.enabled
    ? `, and new members receive <strong>${FIRST_SUBSCRIPTION_PROMO.percent}% off</strong> their first month`
    : "";
  const body = [
    heading("It has been a while"),
    salutation(r.firstName),
    paragraph(
      "Your last visit to The Launch Pad was about a month ago. Whenever you are ready, we would be pleased to have your vehicle looking its best again.",
    ),
    button(`${SITE_URL}/service`, "Book a wash"),
    paragraph(
      `If you wash regularly, unlimited memberships start at <strong>$39.99 a month</strong>${promo}. <a href="${SITE_URL}/pricing">See the plans</a>.`,
    ),
    signoff(),
  ].join("\n");

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: "Your vehicle is due for a wash. Booking takes under a minute.",
      body,
      footerNote: "You are receiving this email because you asked for news and offers from The Launch Pad.",
      unsubscribeUrl: text(r.unsubscribeUrl),
    }),
  };
}

/** Kept for the win-back route; same shape as every marketing sender. */
export type WinbackResendLike = MarketingResendLike;

export function sendWinbackEmails(
  resend: WinbackResendLike,
  recipients: WinbackRecipient[],
  opts: { secret: string; siteUrl: string; today: string },
): Promise<{ sent: number; failed: number; heldBack: number }> {
  return sendMarketingBatch(resend, recipients, {
    ...opts,
    keyPrefix: "winback",
    build: (r, url) => buildWinbackEmail({ firstName: r.firstName, unsubscribeUrl: url }),
  });
}
