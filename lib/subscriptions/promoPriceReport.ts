// Read-only report: memberships still on the OLD first-subscription offer,
// which was built as a permanently discounted price (Stripe price metadata
// is_promo_discount = "true") instead of a one-time discount. Fixed for new
// members on 2026-11-18; this lists the ones already on it so the business
// can decide what to do. Nothing here changes Stripe.

/** Statuses that are still billing (or about to). */
const LIVE = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"]);

/** The offer was 10% off; the full price is the discounted one divided back. */
const OFFER_PERCENT = 10;

export type PromoPriceRow = {
  stripeSubscriptionId: string;
  status: string;
  customer: string;
  email: string;
  interval: string;
  paysNowCents: number;
  fullPriceCents: number;
  differenceCents: number;
};

type SubLike = {
  id: string;
  status: string;
  customer?: { email?: string | null; name?: string | null } | string | null;
  items: {
    data: Array<{
      price: {
        unit_amount: number | null;
        recurring?: { interval?: string } | null;
        metadata?: Record<string, string> | null;
      };
    }>;
  };
};

export function promoPriceRows(subs: SubLike[], namesBySubscription: Record<string, string>): PromoPriceRow[] {
  const rows: PromoPriceRow[] = [];
  for (const s of subs) {
    if (!LIVE.has(s.status)) continue;
    const item = s.items.data.find((i) => i.price.metadata?.is_promo_discount === "true");
    if (!item) continue;
    const paysNow = item.price.unit_amount ?? 0;
    const full = Math.round(paysNow / (1 - OFFER_PERCENT / 100));
    const customer = typeof s.customer === "object" && s.customer ? s.customer : null;
    rows.push({
      stripeSubscriptionId: s.id,
      status: s.status,
      customer: namesBySubscription[s.id] || customer?.name || "",
      email: customer?.email ?? "",
      interval: item.price.recurring?.interval ?? "",
      paysNowCents: paysNow,
      fullPriceCents: full,
      differenceCents: full - paysNow,
    });
  }
  return rows;
}

const dollars = (cents: number) => (cents / 100).toFixed(2);
const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function promoPriceCsv(rows: PromoPriceRow[]): string {
  const header = "customer,email,status,billing,pays_now,full_price,difference,stripe_subscription";
  const lines = rows.map((r) =>
    [r.customer, r.email, r.status, r.interval, dollars(r.paysNowCents), dollars(r.fullPriceCents), dollars(r.differenceCents), r.stripeSubscriptionId]
      .map(quote)
      .join(",")
  );
  return [header, ...lines].join("\n");
}
