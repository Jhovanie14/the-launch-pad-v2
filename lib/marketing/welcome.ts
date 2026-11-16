/**
 * Welcome: an email to someone who opted in to news and offers yesterday
 * for the first time, and isn't a member (members already get "Welcome to
 * The Launch Pad" with their first payment). Runs once a day from
 * /api/cron/marketing-welcome.
 *
 * "First time" = the consent row was CREATED yesterday (Houston date).
 * subscribed_at is not used: recordConsent refreshes it on every opt-in,
 * e.g. every booking with the box ticked. Rows that were ever unsubscribed
 * are skipped. Stateless: a missed cron day is skipped, never sent late.
 * Design: docs/superpowers/specs/2026-11-16-membership-nudge-and-welcome-design.md
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, houstonToday } from "@/lib/admin/bookingQuery";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import { SITE_URL, button, emailLayout, heading, paragraph, text } from "@/lib/email/layout";
import { findMemberAccounts } from "./members";

export interface WelcomeRecipient {
  email: string;
  firstName: string | null;
}

type ConsentRow = { email: string; user_id: string | null; created_at: string; unsubscribed_at: string | null };
type ProfileRow = { id: string; email: string | null; full_name: string | null };

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || null;

export async function findWelcomeRecipients(db: SupabaseClient, today: string): Promise<WelcomeRecipient[]> {
  const yesterday = addDays(today, -1);

  // A UTC range wide enough to hold the whole Houston day, then the exact
  // Houston date in code.
  const { data, error } = await db
    .from("marketing_consents")
    .select("email, user_id, created_at, unsubscribed_at")
    .eq("status", "subscribed")
    .gte("created_at", `${addDays(yesterday, -1)}T00:00:00Z`)
    .lt("created_at", `${addDays(today, 1)}T00:00:00Z`);
  if (error) throw error;

  const rows = ((data ?? []) as ConsentRow[]).filter(
    (r) => !r.unsubscribed_at && houstonToday(new Date(r.created_at)) === yesterday,
  );
  if (rows.length === 0) return [];

  const emails = rows.map((r) => r.email);
  const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id))];

  const [isMember, byId, byEmail] = await Promise.all([
    findMemberAccounts(db, emails, userIds),
    userIds.length ? db.from("profiles").select("id, email, full_name").in("id", userIds) : { data: [], error: null },
    db.from("profiles").select("id, email, full_name").in("email", emails),
  ]);
  for (const r of [byId, byEmail]) if (r.error) throw r.error;
  const profiles = [...((byId.data ?? []) as ProfileRow[]), ...((byEmail.data ?? []) as ProfileRow[])];

  const recipients: WelcomeRecipient[] = [];
  for (const r of rows) {
    if (isMember(r.email, r.user_id ? [r.user_id] : [])) continue;
    const profile =
      profiles.find((p) => r.user_id && p.id === r.user_id) ??
      profiles.find((p) => p.email?.toLowerCase() === r.email.toLowerCase());
    recipients.push({ email: r.email, firstName: firstName(profile?.full_name) });
  }
  return recipients;
}

export function buildWelcomeEmail(r: { firstName: string | null; unsubscribeUrl: string }): {
  subject: string;
  html: string;
} {
  const subject = "Welcome to The Launch Pad";
  const offer = FIRST_SUBSCRIPTION_PROMO.enabled
    ? `, with <strong>${FIRST_SUBSCRIPTION_PROMO.percent}% off</strong> your first month`
    : "";
  const body = [
    heading(r.firstName ? `Welcome, ${r.firstName}` : "Welcome to The Launch Pad"),
    paragraph("Thank you for signing up for news and offers from The Launch Pad."),
    paragraph(
      "You'll find us at <strong>10410 S Main St, Houston</strong>. We offer express washes and full details, and you can book online in under a minute.",
    ),
    button(`${SITE_URL}/service`, "Book a wash"),
    paragraph(
      `Washing often? Unlimited memberships start at <strong>$39.99 a month</strong>${offer}. <a href="${SITE_URL}/pricing">See the plans</a>.`,
    ),
  ].join("\n");

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: "Where to find us, and how to book your next wash.",
      body,
      footerNote: "You're getting this email because you asked for news and offers from The Launch Pad.",
      unsubscribeUrl: text(r.unsubscribeUrl),
    }),
  };
}
