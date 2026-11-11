/**
 * Which membership rows the Billing page shows. Booking and pricing only
 * treat "active" as a member; Billing also shows plans whose payment failed
 * (Stripe "past_due", then "unpaid") so the customer sees why and can fix it.
 */

export const BILLING_VISIBLE_STATUSES = ["active", "past_due", "unpaid"] as const;

const RANK: Record<string, number> = { active: 0, past_due: 1, unpaid: 2 };

/** The row to show: active first, then past_due, then unpaid. */
export function pickBillingSubscription<T extends { status: string }>(rows: T[] | null | undefined): T | null {
  if (!rows?.length) return null;
  return [...rows].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9))[0];
}

export function isOverdue(status: string | null | undefined): boolean {
  return status === "past_due" || status === "unpaid";
}
