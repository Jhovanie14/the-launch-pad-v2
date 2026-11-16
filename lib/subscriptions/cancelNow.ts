/**
 * Admin "Cancel now": end a membership immediately, with a full, prorated
 * or no refund of what was paid for the current period. Super admins only
 * (checked by the route). Design: docs/superpowers/specs/2026-11-16-admin-cancel-now-design.md
 *
 * Order matters: the subscription is cancelled BEFORE any refund, so money
 * never leaves while the membership stays active. A refund that fails after
 * the cancel is returned as `refundError` (never thrown): the admin must
 * know the cancel happened and refund in Stripe by hand.
 *
 * Stripe is injected (`CancelNowStripe`) so this is unit tested with a fake.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";

export type RefundKind = "full" | "prorated" | "none";
export type CancelNowProduct = "express" | "self_service";

const TABLE: Record<CancelNowProduct, string> = {
  express: "user_subscription",
  self_service: "self_service_subscriptions",
};
const DAY = 86_400;
const ENDED = new Set(["canceled", "incomplete_expired"]);
type CancelTag = "canceled_by" | "canceled_by_admin_id" | "canceled_now";

type Id = string | { id: string } | null | undefined;
const idOf = (v: Id): string | null => (typeof v === "string" ? v : (v?.id ?? null));

type StripeSub = {
  id: string;
  customer: Id;
  status: string;
  metadata?: Record<string, string> | null;
  items: { data: { current_period_start: number; current_period_end: number }[] };
};

/** The slice of the Stripe SDK this module uses. */
export interface CancelNowStripe {
  subscriptions: {
    retrieve(id: string): Promise<StripeSub>;
    update(id: string, params: Record<string, unknown>): Promise<unknown>;
    cancel(id: string, params: Record<string, unknown>): Promise<unknown>;
  };
  invoices: {
    list(params: { subscription: string; status: "paid"; limit: number }): Promise<{
      data: {
        id: string;
        amount_paid: number | null;
        lines: {
          data: { amount: number; period: { start: number; end: number }; discount_amounts?: { amount: number }[] | null }[];
        };
      }[];
    }>;
  };
  invoicePayments: {
    list(params: { invoice: string; status?: string }): Promise<{
      data: { status: string; amount_paid: number | null; payment: { payment_intent?: Id; charge?: Id } }[];
    }>;
  };
  invoiceItems: {
    list(params: { customer: string; pending: true; limit: number }): Promise<{
      data: { id: string; parent?: { subscription_details?: { subscription?: string } | null } | null }[];
    }>;
    del(id: string): Promise<unknown>;
  };
  refunds: {
    create(
      params: { payment_intent?: string; charge?: string; amount: number },
      options: { idempotencyKey: string },
    ): Promise<unknown>;
  };
}

export interface CancelNowQuote {
  table: string;
  rowId: string;
  stripeSubscriptionId: string;
  customerId: string | null;
  /** The tags the subscription had before Cancel now, to restore if the cancel fails. */
  previousTags: Record<CancelTag, string>;
  paidCents: number;
  paymentIntentId: string | null;
  chargeId: string | null;
  periodStart: number;
  periodEnd: number;
  fullCents: number;
  proratedCents: number;
  unusedDays: number;
  periodDays: number;
}

/** The unused share of `paidCents`, rounded down, never below 0 or above what was paid. */
export function proratedCents(paidCents: number, periodStart: number, periodEnd: number, nowSec: number): number {
  const period = periodEnd - periodStart;
  if (period <= 0 || paidCents <= 0) return 0;
  const unused = Math.min(period, Math.max(0, periodEnd - nowSec));
  return Math.min(paidCents, Math.max(0, Math.floor((paidCents * unused) / period)));
}

export async function loadCancelNowQuote(
  db: SupabaseClient,
  stripe: CancelNowStripe,
  userId: string,
  product: CancelNowProduct,
  now: Date = new Date(),
): Promise<CancelNowQuote> {
  const table = TABLE[product];
  const { data: row } = await db
    .from(table)
    .select("id, stripe_subscription_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!row?.stripe_subscription_id) {
    throw new ApiError(product === "express" ? "No active subscription" : "No active self-service subscription", 404);
  }

  const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
  if (ENDED.has(sub.status)) throw new ApiError("This subscription has already ended in Stripe", 409);

  const item = sub.items.data[0];
  const periodStart = item?.current_period_start ?? 0;
  const periodEnd = item?.current_period_end ?? 0;

  // What was paid for THIS period: the latest paid invoice's lines for the
  // current period, net of discounts, capped at what that invoice collected.
  // Proration lines from vehicle changes cover other periods and are left out.
  let paidCents = 0;
  let paymentIntentId: string | null = null;
  let chargeId: string | null = null;
  const { data: invoices } = await stripe.invoices.list({ subscription: sub.id, status: "paid", limit: 1 });
  const invoice = invoices[0];
  if (invoice) {
    const periodNet = invoice.lines.data
      .filter((l) => l.period.start === periodStart && l.period.end === periodEnd)
      .reduce((sum, l) => sum + l.amount - (l.discount_amounts ?? []).reduce((d, x) => d + x.amount, 0), 0);
    paidCents = Math.max(0, Math.min(invoice.amount_paid ?? 0, periodNet));
    if (paidCents > 0) {
      const { data } = await stripe.invoicePayments.list({ invoice: invoice.id, status: "paid" });
      const payment = data.find((p) => p.status === "paid");
      paymentIntentId = idOf(payment?.payment.payment_intent);
      chargeId = idOf(payment?.payment.charge);
    }
  }

  const tags = sub.metadata ?? {};
  const nowSec = Math.floor(now.getTime() / 1000);
  return {
    table,
    rowId: row.id,
    stripeSubscriptionId: sub.id,
    customerId: idOf(sub.customer),
    previousTags: { canceled_by: tags.canceled_by ?? "", canceled_by_admin_id: tags.canceled_by_admin_id ?? "", canceled_now: tags.canceled_now ?? "" },
    paidCents,
    paymentIntentId,
    chargeId,
    periodStart,
    periodEnd,
    fullCents: paidCents,
    proratedCents: proratedCents(paidCents, periodStart, periodEnd, nowSec),
    unusedDays: Math.round(Math.max(0, periodEnd - nowSec) / DAY),
    periodDays: Math.round((periodEnd - periodStart) / DAY),
  };
}

/** Pending charges (prorations from a vehicle change) for this subscription would land on the customer's next bill. */
async function deletePendingItems(stripe: CancelNowStripe, customerId: string | null, subscriptionId: string) {
  if (!customerId) return;
  try {
    const { data } = await stripe.invoiceItems.list({ customer: customerId, pending: true, limit: 100 });
    for (const item of data) {
      if (item.parent?.subscription_details?.subscription === subscriptionId) await stripe.invoiceItems.del(item.id);
    }
  } catch (err) {
    console.error("[cancel-now] could not remove pending charges; check the customer in Stripe:", err);
  }
}

export async function cancelNow(
  db: SupabaseClient,
  stripe: CancelNowStripe,
  args: { userId: string; product: CancelNowProduct; refund: RefundKind; adminId: string; reason: string },
  now: Date = new Date(),
): Promise<{ quote: CancelNowQuote; refundedCents: number; refundError: string | null }> {
  const quote = await loadCancelNowQuote(db, stripe, args.userId, args.product, now);
  const id = quote.stripeSubscriptionId;

  // Tagged first, so the webhook knows our notice replaces the "rejoin" email.
  await stripe.subscriptions.update(id, {
    metadata: { canceled_by: "admin", canceled_by_admin_id: args.adminId, canceled_now: "true" },
    cancellation_details: { comment: `Cancelled now by admin: ${args.reason}` },
  });

  try {
    await stripe.subscriptions.cancel(id, { prorate: false });
  } catch (err) {
    // A timeout can hide a cancel that did happen: check before giving up.
    const actual = await stripe.subscriptions.retrieve(id).catch(() => null);
    if (!actual || !ENDED.has(actual.status)) {
      // Still active: restore the earlier tags, or the "cancelled now" tag would
      // later suppress their normal "membership ended" email.
      await stripe.subscriptions
        .update(id, { metadata: quote.previousTags })
        .catch((untagError) => console.error("[cancel-now] could not restore the tags after a failed cancel:", untagError));
      throw err;
    }
  }

  await deletePendingItems(stripe, quote.customerId, id);

  // The webhook confirms the same; stamp now so the admin page is right at once.
  const { error: stampError } = await db
    .from(quote.table)
    .update({ status: "canceled", cancel_at_period_end: false })
    .eq("id", quote.rowId);
  if (stampError) console.error("[cancel-now] DB stamp failed (the webhook will correct it):", stampError);

  const amount = args.refund === "full" ? quote.fullCents : args.refund === "prorated" ? quote.proratedCents : 0;
  if (amount <= 0) return { quote, refundedCents: 0, refundError: null };

  if (!quote.paymentIntentId && !quote.chargeId) {
    return { quote, refundedCents: 0, refundError: "No payment was found on the latest invoice to refund." };
  }
  try {
    await stripe.refunds.create(
      quote.paymentIntentId ? { payment_intent: quote.paymentIntentId, amount } : { charge: quote.chargeId!, amount },
      { idempotencyKey: `cancel-now/${id}` },
    );
    return { quote, refundedCents: amount, refundError: null };
  } catch (err) {
    console.error("[cancel-now] refund failed after cancel:", err);
    return { quote, refundedCents: 0, refundError: err instanceof Error ? err.message : "The refund failed." };
  }
}
