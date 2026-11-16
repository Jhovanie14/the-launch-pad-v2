/**
 * Membership nudge: an email to an opted-in, pay-per-wash customer the day
 * after their SECOND paid wash within 30 days, showing what they paid and
 * what a membership costs. Runs once a day from /api/cron/marketing-nudge.
 *
 * Stateless, like win-back: "exactly 2 paid washes in the 30 days ending
 * yesterday, one of them yesterday" fires once per run of visits (a third
 * wash makes it 3). A missed cron day is skipped; same-day retries are
 * deduplicated by Resend idempotency keys.
 *
 * Paid wash: completed, paid by card or cash, price above $0.
 * Never emailed: members with an active plan, anyone not opted in.
 * Design: docs/superpowers/specs/2026-11-16-membership-nudge-and-welcome-design.md
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/admin/bookingQuery";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import { SITE_URL, button, emailLayout, heading, money, paragraph, text } from "@/lib/email/layout";
import { getConsentStatus } from "./consent";
import { findMemberAccounts } from "./members";

export const NUDGE_WINDOW_DAYS = 30;
export const NUDGE_AT_PAID_WASHES = 2;

export interface NudgeRecipient {
  email: string;
  firstName: string | null;
  washes: number;
  spent: number;
}

type WashRow = {
  id: string;
  customer_email: string | null;
  customer_name: string | null;
  user_id: string | null;
  appointment_date: string;
  status: string;
  payment_method: string | null;
  total_price: unknown;
};

export function isPaidWash(b: { status: string; payment_method: string | null; total_price: unknown }): boolean {
  const price = Number(b.total_price);
  return (
    b.status === "completed" &&
    (b.payment_method === "card" || b.payment_method === "cash") &&
    b.total_price !== null &&
    Number.isFinite(price) &&
    price > 0
  );
}

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || null;

export async function findNudgeRecipients(
  db: SupabaseClient,
  today: string,
  deps: { isOptedIn?: (email: string) => Promise<boolean> } = {},
): Promise<NudgeRecipient[]> {
  const isOptedIn =
    deps.isOptedIn ?? (async (email: string) => (await getConsentStatus(db, email)) === "subscribed");
  const yesterday = addDays(today, -1);
  const windowStart = addDays(yesterday, -(NUDGE_WINDOW_DAYS - 1));

  // Every completed booking in the window, grouped in code: emails differ in
  // case between bookings, which an exact `in` filter would miss. A month of
  // completed washes is a few hundred light rows.
  const { data, error } = await db
    .from("bookings")
    .select("id, customer_email, customer_name, user_id, appointment_date, status, payment_method, total_price")
    .eq("status", "completed")
    .gte("appointment_date", windowStart)
    .lte("appointment_date", yesterday);
  if (error) throw error;
  const paid = ((data ?? []) as WashRow[]).filter(isPaidWash);

  // People with a paid wash yesterday, one per inbox.
  const people = new Map<string, { email: string; name: string | null; userIds: Set<string> }>();
  for (const b of paid) {
    if (b.appointment_date !== yesterday) continue;
    const email = b.customer_email?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    const person = people.get(key) ?? { email, name: null, userIds: new Set<string>() };
    person.name ??= b.customer_name;
    if (b.user_id) person.userIds.add(b.user_id);
    people.set(key, person);
  }

  const candidates: (NudgeRecipient & { userIds: Set<string> })[] = [];
  for (const [key, person] of people) {
    const theirs = paid.filter(
      (b) => b.customer_email?.trim().toLowerCase() === key || (!!b.user_id && person.userIds.has(b.user_id)),
    );
    if (theirs.length !== NUDGE_AT_PAID_WASHES) continue;
    const spent = Math.round(theirs.reduce((sum, b) => sum + Number(b.total_price), 0) * 100) / 100;
    candidates.push({
      email: person.email,
      firstName: firstName(person.name),
      washes: theirs.length,
      spent,
      userIds: person.userIds,
    });
  }
  if (candidates.length === 0) return [];

  const isMember = await findMemberAccounts(
    db,
    candidates.map((c) => c.email),
    [...new Set(candidates.flatMap((c) => [...c.userIds]))],
  );

  const recipients: NudgeRecipient[] = [];
  for (const { userIds, ...c } of candidates) {
    if (isMember(c.email, userIds)) continue;
    if (!(await isOptedIn(c.email))) continue;
    recipients.push(c);
  }
  return recipients;
}

export function buildNudgeEmail(r: {
  firstName: string | null;
  washes: number;
  spent: number;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const subject = "Two washes this month? A membership could save you money";
  const greeting = r.firstName ? `Thanks for coming back, ${r.firstName}` : "Thanks for coming back";
  const offer = FIRST_SUBSCRIPTION_PROMO.enabled
    ? `, and new members get <strong>${FIRST_SUBSCRIPTION_PROMO.percent}% off</strong> their first month`
    : "";
  const body = [
    heading(greeting),
    paragraph(
      `You've paid <strong>${money(r.spent)}</strong> for ${r.washes} washes in the last ${NUDGE_WINDOW_DAYS} days.`,
    ),
    paragraph(`Unlimited memberships start at <strong>$39.99 a month</strong>${offer}.`),
    button(`${SITE_URL}/pricing`, "See the plans"),
    paragraph("No contract. Cancel any time.", { muted: true }),
  ].join("\n");

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: "Wash as often as you like for one monthly price.",
      body,
      footerNote: "You're getting this email because you asked for news and offers from The Launch Pad.",
      unsubscribeUrl: text(r.unsubscribeUrl),
    }),
  };
}
