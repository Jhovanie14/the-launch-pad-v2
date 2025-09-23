import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role key bypasses RLS
);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const raw = await req.text();

  if (!sig) {
    return NextResponse.json({ error: "No Stripe Signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new Response(`Webhook Error: ${error.message}`, { status: 404 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("SESSION METADATA:", session.metadata);
    console.log("RAW BOOKING", session.metadata?.booking);
    const bookingMeta = session.metadata?.booking
      ? JSON.parse(session.metadata.booking)
      : null;

    if (bookingMeta) {
      const {
        user_id,
        service_package_id,
        service_package_name,
        service_package_price,
        add_ons_id,
        appointment_date,
        appointment_time,
        total_price,
        total_duration,
        vehicle_id,
        customer_name,
        customer_email,
        customer_phone,
        notes,
        special_instructions,
      } = bookingMeta;

      const finalCustomerName =
        customer_name ?? session.customer_details?.name ?? null;
      const finalCustomerEmail =
        customer_email ?? session.customer_email ?? null;
      const finalCustomerPhone =
        customer_phone ?? session.customer_details?.phone ?? null;

      const dateIso = appointment_date;
      const timeStr = appointment_time;

      const { error } = await supabase.from("bookings").insert([
        {
          user_id,
          service_package_id,
          vehicle_id,
          service_package_name,
          service_package_price,
          add_ons_id,
          appointment_date: dateIso,
          appointment_time: timeStr,
          total_price,
          total_duration,
          status: "pending",
          customer_name: finalCustomerName,
          customer_email: finalCustomerEmail,
          customer_phone,
          notes,
          special_instructions,
          // optionally store Stripe refs
          payment_intent_id: session.payment_intent,
          // checkout_session_id: session.id,
        },
      ]);
      if (error) {
        console.error("Supabase insert error:", error);
      } else {
        console.log("Booking inserted!");
      }
    }

    // Subscription checkout handling (won't affect booking path)
    if (
      session.mode === "subscription" &&
      session.subscription &&
      session.customer
    ) {
      const appUserId = session.metadata?.app_user_id || null;
      // planId/billingCycle not stored in current schema

      const subscriptionResp = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      // extract fields we need from Stripe subscription
      const sub = subscriptionResp as any;
      const cps = Number(sub?.current_period_start);
      const cpe = Number(sub?.current_period_end);
      const currentPeriodStartIso = Number.isFinite(cps)
        ? new Date(cps * 1000).toISOString()
        : new Date().toISOString();
      const currentPeriodEndIso = Number.isFinite(cpe)
        ? new Date(cpe * 1000).toISOString()
        : null;
      const priceId = sub?.items?.data?.[0]?.price?.id ?? null;
      const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);

      await supabase.from("user_subscription").upsert(
        {
          user_id: appUserId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: sub.id as string,
          price_id: priceId,
          status: sub.status as string,
          current_period_start: currentPeriodStartIso,
          current_period_end: currentPeriodEndIso,
          cancel_at_period_end: cancelAtPeriodEnd,
        },
        { onConflict: "stripe_customer_id" }
      );
    }
  }
  return new Response("ok", { status: 200 });
}
