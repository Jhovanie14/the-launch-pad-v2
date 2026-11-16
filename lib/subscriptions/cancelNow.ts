/**
 * Admin "Cancel now": end a membership immediately, with a full, prorated
 * or no refund of the latest payment. Super admins only (checked by the
 * route). Design: docs/superpowers/specs/2026-11-16-admin-cancel-now-design.md
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

type Id = string | { id: string } | null | undefined;
const idOf = (v: Id): string | null => (typeof v === "string" ? v : (v?.id ?? null));

/** The slice of the Stripe SDK this module uses. */
export interface CancelNowStripe {
  subscriptions: {
    retrieve(id: string): Promise<{
      id: string;
      status: string;
      latest_invoice: Id;
      items: { data: { current_period_start: number; current_period_end: number }[] };
    }>;
    update(id: string, params: Record<string, unknown>): Promise<unknown>;
    cancel(id: string, params: Record<string, unknown>): Promise<unknown>;
  };
  invoicePayments: {
    list(params: { invoice: string; status?: string }): Promise<{
      data: { status: string; amount_paid: number | null; payment: { payment_intent?: Id; charge?: Id } }[];
    }>;
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

  let paidCents = 0;
  let paymentIntentId: string | null = null;
  let chargeId: string | null = null;
  const invoiceId = idOf(sub.latest_invoice);
  if (invoiceId) {
    const { data } = await stripe.invoicePayments.list({ invoice: invoiceId, status: "paid" });
    const paid = data.find((p) => p.status === "paid");
    if (paid) {
      paidCents = Math.max(0, paid.amount_paid ?? 0);
      paymentIntentId = idOf(paid.payment.payment_intent);
      chargeId = idOf(paid.payment.charge);
    }
  }

  const nowSec = Math.floor(now.getTime() / 1000);
  return {
    table,
    rowId: row.id,
    stripeSubscriptionId: sub.id,
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
    // Still active: drop the tag, or it would later suppress their normal
    // "membership ended" email. Empty strings unset Stripe metadata keys.
    await stripe.subscriptions
      .update(id, { metadata: { canceled_by: "", canceled_by_admin_id: "", canceled_now: "" } })
      .catch((untagError) => console.error("[cancel-now] could not remove the tag after a failed cancel:", untagError));
    throw err;
  }

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
