/**
 * Membership nudge: an email to an opted-in, pay-per-wash customer the day
 * after their SECOND paid wash within 30 days, showing what they paid and
 * what a membership costs. Runs once a day from /api/cron/marketing-nudge.
 *
 * Stateless, like win-back: "exactly 2 paid washes in the 30 days ending
 * yesterday, one of them yesterday, and none in the 30 days before the
 * earlier one" fires once per run of visits (a third wash makes it 3, and a
 * regular washing every few weeks never has the quiet 30 days). A missed
 * cron day is skipped; same-day retries are deduplicated by Resend
 * idempotency keys.
 *
 * Paid wash: completed, paid by card or cash, price above $0.
 * Never emailed: members with an active plan, anyone not opted in.
 * Design: docs/superpowers/specs/2026-11-16-membership-nudge-and-welcome-design.md
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/admin/bookingQuery";
import { fetchAllPages } from "@/lib/admin/bookingQueue";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import { SITE_URL, button, emailLayout, heading, salutation, signoff, money, paragraph, text } from "@/lib/email/layout";
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
  // Twice the window: the run's earlier wash needs 30 quiet days before it.
  const lookbackStart = addDays(windowStart, -NUDGE_WINDOW_DAYS);

  // Every paid wash in the lookback, grouped in code: emails differ in case
  // between bookings, which an exact `in` filter would miss. Paged, since a
  // request returns at most 1,000 rows.
  const { data, error } = await fetchAllPages<WashRow, unknown>((from, to) =>
    db
      .from("bookings")
      .select("id, customer_email, customer_name, user_id, appointment_date, status, payment_method, total_price")
      .eq("status", "completed")
      .in("payment_method", ["card", "cash"])
      .gt("total_price", 0)
      .gte("appointment_date", lookbackStart)
      .lte("appointment_date", yesterday)
      .order("id")
      .range(from, to),
  );
  if (error) throw error;
  const paid = (data ?? []).filter(isPaidWash);

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

  // One account booking under two emails is one person: merge entries that
  // share an account, keeping the first email seen.
  const persons: { email: string; name: string | null; keys: Set<string>; userIds: Set<string> }[] = [];
  for (const [key, p] of people) {
    const into = persons.find((m) => [...p.userIds].some((id) => m.userIds.has(id)));
    if (into) {
      into.keys.add(key);
      for (const id of p.userIds) into.userIds.add(id);
      into.name ??= p.name;
    } else {
      persons.push({ ...p, keys: new Set([key]), userIds: new Set(p.userIds) });
    }
  }

  const candidates: (NudgeRecipient & { userIds: Set<string> })[] = [];
  for (const person of persons) {
    const all = paid.filter(
      (b) =>
        person.keys.has(b.customer_email?.trim().toLowerCase() ?? "") || (!!b.user_id && person.userIds.has(b.user_id)),
    );
    const theirs = all.filter((b) => b.appointment_date >= windowStart);
    if (theirs.length !== NUDGE_AT_PAID_WASHES) continue;
    // A new run of visits only: a regular washing every few weeks always has
    // two in the window, so also require 30 quiet days before the earlier one.
    const runStart = theirs.reduce((min, b) => (b.appointment_date < min ? b.appointment_date : min), yesterday);
    const quietFrom = addDays(runStart, -NUDGE_WINDOW_DAYS);
    if (all.some((b) => b.appointment_date >= quietFrom && b.appointment_date < runStart)) continue;
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
  const subject = "Two visits this month: a membership may suit you";
  const offer = FIRST_SUBSCRIPTION_PROMO.enabled
    ? `, and new members receive <strong>${FIRST_SUBSCRIPTION_PROMO.percent}% off</strong> their first month`
    : "";
  const body = [
    heading("Thank you for coming back"),
    salutation(r.firstName),
    paragraph(
      `Thank you for your recent visits. You have paid <strong>${money(r.spent)}</strong> for ${r.washes} washes in the last ${NUDGE_WINDOW_DAYS} days.`,
    ),
    paragraph(`If you wash regularly, unlimited memberships start at <strong>$39.99 a month</strong>${offer}.`),
    button(`${SITE_URL}/pricing`, "See the plans"),
    paragraph("There is no contract, and you may cancel at any time.", { muted: true }),
    signoff(),
  ].join("\n");

  return {
    subject,
    html: emailLayout({
      title: subject,
      preheader: "Wash as often as you like for one monthly price.",
      body,
      footerNote: "You are receiving this email because you asked for news and offers from The Launch Pad.",
      unsubscribeUrl: text(r.unsubscribeUrl),
    }),
  };
}
