import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { AuthError, requireSuperAdmin } from "@/lib/auth/guards";
import { promoPriceCsv, promoPriceRows } from "@/lib/subscriptions/promoPriceReport";

/**
 * Read-only report for super admins: memberships still on the old permanent
 * 10% offer price (see lib/subscriptions/promoPriceReport.ts). Changes nothing.
 *   JSON: GET /api/admin/reports/promo-price-members
 *   CSV:  GET /api/admin/reports/promo-price-members?format=csv
 */
export async function GET(req: Request) {
  try {
    await requireSuperAdmin(await createClient(), createAdminClient());
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const subs: Stripe.Subscription[] = [];
  for await (const s of stripe.subscriptions.list({
    status: "all",
    limit: 100,
    expand: ["data.customer"],
  })) {
    subs.push(s);
  }

  // Names from our own records where we have them.
  const admin = createAdminClient();
  const ids = subs.map((s) => s.id);
  const namesBySubscription: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data: rows } = await admin
      .from("user_subscription")
      .select("stripe_subscription_id, user_id")
      .in("stripe_subscription_id", ids.slice(i, i + 200));
    const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length
      ? await admin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));
    for (const r of rows ?? []) {
      if (r.stripe_subscription_id) namesBySubscription[r.stripe_subscription_id] = nameOf.get(r.user_id) ?? "";
    }
  }

  const rows = promoPriceRows(subs as any, namesBySubscription);

  if (new URL(req.url).searchParams.get("format") === "csv") {
    return new Response(promoPriceCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="promo-price-members.csv"`,
      },
    });
  }

  const totalCents = rows.reduce((sum, r) => sum + r.differenceCents, 0);
  return NextResponse.json({
    members: rows.length,
    monthlyDifference: (rows.filter((r) => r.interval === "month").reduce((s, r) => s + r.differenceCents, 0) / 100).toFixed(2),
    totalDifferencePerPeriod: (totalCents / 100).toFixed(2),
    rows,
  });
}
