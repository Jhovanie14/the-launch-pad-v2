import { stripe } from "@/lib/stripe/stripe";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  flockPriceMetadata,
  isCommercialPlan,
} from "@/lib/pricing/flockPricing";
import { NextRequest, NextResponse } from "next/server";

/**
 * Reprice legacy commercial flock items to the full plan price.
 *
 * Commercial plans never should have given the 35% family discount, but every
 * additional vehicle added before that rule existed is sitting on a discounted
 * Stripe price. This walks active commercial subscriptions and swaps those
 * items onto the plan's full price.
 *
 * `proration_behavior: "none"` is the whole point: the customer is NOT charged
 * a catch-up amount for the current cycle. The new rate simply appears on their
 * next renewal invoice.
 *
 * Dry run by default — it reports what it would change and touches nothing.
 *   Preview: GET /api/admin/reprice-commercial-flock?secret=SECRET
 *   Apply:   GET /api/admin/reprice-commercial-flock?secret=SECRET&apply=true
 */

interface ItemPlan {
  stripe_item_id: string;
  current_amount: number | null;
  target_amount: number;
  action: "reprice" | "already-full-price" | "skipped";
  reason?: string;
}

interface SubscriptionResult {
  subscription_id: string;
  stripe_subscription_id: string;
  plan_name: string;
  billing_cycle: string;
  full_price_cents: number;
  items: ItemPlan[];
  error?: string;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apply = req.nextUrl.searchParams.get("apply") === "true";
  const admin = createAdminClient();

  // Every active subscription, with its plan. Filtering happens in code so the
  // name fallback in isCommercialPlan still catches rows the migration's
  // backfill missed.
  const { data: subs, error: subsError } = await admin
    .from("user_subscription")
    .select(
      `
      id,
      stripe_subscription_id,
      billing_cycle,
      subscription_plan_id,
      subscription_plans (
        name,
        is_commercial,
        monthly_price,
        yearly_price,
        stripe_price_id_monthly,
        stripe_price_id_yearly
      )
    `
    )
    .eq("status", "active");

  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }

  const commercialSubs = (subs ?? []).filter((s: any) =>
    isCommercialPlan(s.subscription_plans)
  );

  if (commercialSubs.length === 0) {
    return NextResponse.json({
      mode: apply ? "apply" : "dry-run",
      message: "No active commercial subscriptions found.",
      summary: { subscriptions_processed: 0, items_repriced: 0 },
      details: [],
    });
  }

  const results: SubscriptionResult[] = [];

  for (const sub of commercialSubs as any[]) {
    const plan = sub.subscription_plans;
    const isYearly = sub.billing_cycle === "year";

    const result: SubscriptionResult = {
      subscription_id: sub.id,
      stripe_subscription_id: sub.stripe_subscription_id ?? "(none)",
      plan_name: plan?.name ?? "(unknown)",
      billing_cycle: sub.billing_cycle ?? "month",
      full_price_cents: 0,
      items: [],
    };

    if (!sub.stripe_subscription_id) {
      result.error = "No stripe_subscription_id on the subscription record";
      results.push(result);
      continue;
    }

    // Resolve the plan's canonical full price from Stripe.
    const planPriceRef = isYearly
      ? plan?.stripe_price_id_yearly
      : plan?.stripe_price_id_monthly;

    let fullPriceId: string | null = null;
    let fullAmount = 0;

    try {
      if (planPriceRef?.startsWith("price_")) {
        const price = await stripe.prices.retrieve(planPriceRef);
        fullPriceId = price.id;
        fullAmount = price.unit_amount ?? 0;
      } else if (planPriceRef?.startsWith("prod_")) {
        const prices = await stripe.prices.list({
          product: planPriceRef,
          active: true,
          recurring: { interval: isYearly ? "year" : "month" },
          limit: 1,
        });
        fullPriceId = prices.data[0]?.id ?? null;
        fullAmount = prices.data[0]?.unit_amount ?? 0;
      }
    } catch (err: any) {
      result.error = `Could not resolve plan price: ${err?.message}`;
      results.push(result);
      continue;
    }

    if (!fullPriceId || fullAmount <= 0) {
      result.error = "Plan has no usable Stripe price for this billing cycle";
      results.push(result);
      continue;
    }

    result.full_price_cents = fullAmount;

    let stripeSub: Awaited<ReturnType<typeof stripe.subscriptions.retrieve>>;
    try {
      stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    } catch (err: any) {
      result.error = `Stripe retrieve failed: ${err?.message}`;
      results.push(result);
      continue;
    }

    // The primary item stays untouched; only additional-vehicle items below the
    // full plan price are legacy discounts.
    const [, ...additionalItems] = stripeSub.items.data;

    for (const item of additionalItems) {
      const currentAmount = item.price.unit_amount ?? null;

      if (currentAmount !== null && currentAmount >= fullAmount) {
        result.items.push({
          stripe_item_id: item.id,
          current_amount: currentAmount,
          target_amount: fullAmount,
          action: "already-full-price",
        });
        continue;
      }

      if (!apply) {
        result.items.push({
          stripe_item_id: item.id,
          current_amount: currentAmount,
          target_amount: fullAmount,
          action: "reprice",
        });
        continue;
      }

      try {
        // A dedicated full-price flock price keeps the item tagged as an
        // additional vehicle, which remove-vehicle relies on to match items.
        const productId =
          typeof item.price.product === "string"
            ? item.price.product
            : (item.price.product as any).id;

        const existing = await stripe.prices.list({
          product: productId,
          active: true,
          limit: 100,
        });

        const reusable = existing.data.find(
          (p) =>
            p.unit_amount === fullAmount &&
            p.recurring?.interval === item.price.recurring?.interval &&
            p.metadata?.is_flock_item === "true" &&
            p.metadata?.is_flock_discount === "false"
        );

        const targetPrice =
          reusable ??
          (await stripe.prices.create({
            currency: item.price.currency,
            unit_amount: fullAmount,
            recurring: {
              interval: item.price.recurring!.interval,
              interval_count: item.price.recurring!.interval_count ?? 1,
            },
            product: productId,
            metadata: flockPriceMetadata(sub.subscription_plan_id, plan),
          }));

        // proration_behavior "none": no catch-up charge for the current cycle.
        // The new rate lands on the next renewal invoice.
        await stripe.subscriptionItems.update(item.id, {
          price: targetPrice.id,
          proration_behavior: "none",
        });

        result.items.push({
          stripe_item_id: item.id,
          current_amount: currentAmount,
          target_amount: fullAmount,
          action: "reprice",
        });
      } catch (err: any) {
        result.items.push({
          stripe_item_id: item.id,
          current_amount: currentAmount,
          target_amount: fullAmount,
          action: "skipped",
          reason: err?.message ?? "Unknown Stripe error",
        });
      }
    }

    results.push(result);
  }

  const itemsRepriced = results.reduce(
    (sum, r) => sum + r.items.filter((i) => i.action === "reprice").length,
    0
  );
  const itemsSkipped = results.reduce(
    (sum, r) => sum + r.items.filter((i) => i.action === "skipped").length,
    0
  );

  return NextResponse.json({
    mode: apply ? "apply" : "dry-run",
    message: apply
      ? "Repriced. Customers are not charged a proration — the new rate applies from their next renewal."
      : "Dry run — nothing was changed. Re-run with &apply=true to write these changes.",
    summary: {
      subscriptions_processed: results.length,
      items_repriced: itemsRepriced,
      items_skipped: itemsSkipped,
      subscriptions_with_errors: results.filter((r) => r.error).length,
    },
    details: results,
  });
}
