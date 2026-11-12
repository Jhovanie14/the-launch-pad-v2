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
import { FROM, SITE_URL, button, emailLayout, heading, paragraph, text } from "@/lib/email/layout";
import { getConsentStatus } from "./consent";
import { createUnsubscribeToken, unsubscribeUrl } from "./unsubscribeToken";

export const WINBACK_AFTER_DAYS = 30;
const BATCH_SIZE = 100; // Resend batch limit

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
  const { data: profiles, error: profileError } = await db
    .from("profiles")
    .select("id, email")
    .in("email", emails);
  if (profileError) throw profileError;
  const profileIdByEmail = new Map<string, string>();
  for (const p of (profiles ?? []) as { id: string; email: string | null }[]) {
    if (p.email) profileIdByEmail.set(p.email.toLowerCase(), p.id);
  }
  const accountIds = [...new Set([...userIds, ...profileIdByEmail.values()])];

  const activePlans = (table: string) =>
    accountIds.length === 0
      ? Promise.resolve({ data: [] as { user_id: string }[], error: null })
      : db.from(table).select("user_id").eq("status", "active").in("user_id", accountIds);

  const [byEmailLater, byUserLater, plans, selfPlans] = await Promise.all([
    later("customer_email", emails),
    later("user_id", userIds),
    activePlans("user_subscription"),
    activePlans("self_service_subscriptions"),
  ]);
  for (const r of [byEmailLater, byUserLater, plans, selfPlans]) if (r.error) throw r.error;

  const returnedEmails = new Set(
    ((byEmailLater.data ?? []) as VisitRow[]).map((r) => r.customer_email?.toLowerCase()).filter(Boolean),
  );
  const returnedUsers = new Set(((byUserLater.data ?? []) as VisitRow[]).map((r) => r.user_id).filter(Boolean));
  const members = new Set(
    [...(plans.data ?? []), ...(selfPlans.data ?? [])].map((r) => (r as { user_id: string }).user_id),
  );

  const recipients: WinbackRecipient[] = [];
  for (const [key, entry] of byEmail) {
    if (returnedEmails.has(key)) continue;
    if ([...entry.userIds].some((id) => returnedUsers.has(id) || members.has(id))) continue;
    const profileId = profileIdByEmail.get(key);
    if (profileId && members.has(profileId)) continue;
    if (!(await isOptedIn(entry.email))) continue;
    recipients.push({ email: entry.email, firstName: firstName(entry.name) });
  }
  return recipients;
}

export function buildWinbackEmail(r: { firstName: string | null; unsubscribeUrl: string }): {
  subject: string;
  html: string;
} {
  const subject = "We miss you at The Launch Pad";
  const greeting = r.firstName ? `It’s been a while, ${r.firstName}` : "It’s been a while";
  const promo = FIRST_SUBSCRIPTION_PROMO.enabled
    ? `, and new members get <strong>${FIRST_SUBSCRIPTION_PROMO.percent}% off</strong> their first month`
    : "";
  const body = [
    heading(greeting),
    paragraph(
      "Your last wash with us was about a month ago. Houston roads don't stay kind to a clean car for long, so come back and let us get it shining again.",
    ),
    button(`${SITE_URL}/service`, "Book a wash"),
    paragraph(
      `Washing every few weeks? A membership starts at <strong>$39.99 a month</strong>${promo}. <a href="${SITE_URL}/pricing">See the plans</a>.`,
    ),
  ].join("\n");

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: "Your car is due for a wash. Book in under a minute.",
      body,
      footerNote: "You're getting this email because you asked for news and offers from The Launch Pad.",
      unsubscribeUrl: text(r.unsubscribeUrl),
    }),
  };
}

/** The slice of the Resend SDK this module uses; tests pass fakes. */
export interface WinbackResendLike {
  batch: {
    send(
      emails: { from: string; to: string; subject: string; html: string; headers: Record<string, string> }[],
      options: { idempotencyKey: string },
    ): Promise<{ data: unknown; error: unknown }>;
  };
}

export async function sendWinbackEmails(
  resend: WinbackResendLike,
  recipients: WinbackRecipient[],
  opts: { secret: string; siteUrl: string; today: string },
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const emails = chunk.map((r) => {
      const oneClick = `${opts.siteUrl}/api/marketing/unsubscribe?t=${createUnsubscribeToken(r.email, opts.secret)}`;
      const { subject, html } = buildWinbackEmail({
        firstName: r.firstName,
        unsubscribeUrl: unsubscribeUrl(r.email, opts.secret, opts.siteUrl),
      });
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
        idempotencyKey: `winback/${opts.today}/${i / BATCH_SIZE}`,
      });
      if (error) {
        console.error("[marketing] win-back batch failed:", error);
        failed += chunk.length;
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      console.error("[marketing] win-back batch threw:", err);
      failed += chunk.length;
    }
  }
  return { sent, failed };
}
