import { sendBookingConfirmationEmail } from "@/lib/email/sendConfirmation";
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
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Handle events with a clean switch statement
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response("ok", { status: 200 });
}

// ========================================
// BOOKING HANDLER
// ========================================
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  // Handle booking checkout
  if (session.mode === "payment") {
    await processBooking(session);
  }

  // Handle subscription checkout
  if (session.mode === "subscription") {
    await processSubscription(session);
  }
}

async function processBooking(session: Stripe.Checkout.Session) {
  console.log("SESSION METADATA:", session.metadata);
  console.log("RAW BOOKING", session.metadata?.booking);

  const bookingMeta = session.metadata?.booking
    ? JSON.parse(session.metadata.booking)
    : null;

  if (!bookingMeta) {
    console.log("No booking metadata found");
    return;
  }

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
  const finalCustomerEmail = customer_email ?? session.customer_email ?? null;
  const finalCustomerPhone =
    customer_phone ?? session.customer_details?.phone ?? null;

  const { data: bookingRows, error } = await supabase
    .from("bookings")
    .insert([
      {
        user_id,
        service_package_id,
        vehicle_id,
        service_package_name,
        service_package_price,
        add_ons_id,
        appointment_date,
        appointment_time,
        total_price,
        total_duration,
        status: "pending",
        customer_name: finalCustomerName,
        customer_email: finalCustomerEmail,
        customer_phone: finalCustomerPhone,
        notes,
        special_instructions,
        payment_intent_id: session.payment_intent,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return;
  }

  console.log("Booking inserted!");

  // Send confirmation email
  if (bookingRows?.customer_email) {
    await sendBookingConfirmationEmail({
      to: bookingRows.customer_email,
      customerName: bookingRows.customer_name ?? "Customer",
      bookingId: bookingRows.id,
      servicePackage: bookingRows.service_package_name ?? "Service",
      appointmentDate: bookingRows.appointment_date,
      appointmentTime: bookingRows.appointment_time,
    });
  }
}

// ========================================
// SUBSCRIPTION HANDLERS
// ========================================
async function processSubscription(session: Stripe.Checkout.Session) {
  if (!session.subscription || !session.customer) {
    console.log("No subscription or customer in session");
    return;
  }

  const appUserId = session.metadata?.app_user_id || null;
  const planId = session.metadata?.plan_id || null;
  const billingCycleRaw = session.metadata?.billing_cycle || null;
  const vehicleId = session.metadata?.vehicle_id || null;

  const billingCycle =
    billingCycleRaw === "monthly"
      ? "month"
      : billingCycleRaw === "yearly"
        ? "year"
        : null;

  // Fetch the full subscription object to get accurate period dates
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  const sub = subscription as any;
  const subscriptionItem = sub?.items?.data?.[0];

  const cps = Number(subscriptionItem?.current_period_start);
  const cpe = Number(subscriptionItem?.current_period_end);

  console.log("🔍 Raw billing data from subscription item:", {
    current_period_start: subscriptionItem?.current_period_start,
    current_period_end: subscriptionItem?.current_period_end,
    cps_number: cps,
    cpe_number: cpe,
    is_cps_finite: Number.isFinite(cps),
    is_cpe_finite: Number.isFinite(cpe),
  });

  const currentPeriodStartIso = Number.isFinite(cps)
    ? new Date(cps * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEndIso = Number.isFinite(cpe)
    ? new Date(cpe * 1000).toISOString()
    : null;

  const priceId = sub?.items?.data?.[0]?.price?.id ?? null;
  const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);

  console.log("🔍 Saving subscription with payload:", {
    user_id: appUserId,
    subscription_plan_id: planId,
    billing_cycle: billingCycle,
    stripe_customer_id: session.customer,
    stripe_subscription_id: subscription.id,
    price_id: priceId,
    status: subscription.status,
    current_period_start: currentPeriodStartIso,
    current_period_end: currentPeriodEndIso,
    cancel_at_period_end: cancelAtPeriodEnd,
    vehicle_id: vehicleId,
  });

  // Insert/update subscription
  const { data: subscriptionRow, error: subError } = await supabase
    .from("user_subscription")
    .upsert(
      {
        user_id: appUserId,
        subscription_plan_id: planId,
        billing_cycle: billingCycle,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        price_id: priceId,
        status: subscription.status,
        current_period_start: currentPeriodStartIso,
        current_period_end: currentPeriodEndIso,
        cancel_at_period_end: cancelAtPeriodEnd,
      },
      { onConflict: "stripe_customer_id" }
    )
    .select()
    .single();

  if (subError) {
    console.error("Error saving subscription:", subError);
    return;
  }

  // Link vehicle if provided
  if (vehicleId) {
    const { error: linkError } = await supabase
      .from("subscription_vehicles")
      .insert({
        subscription_id: subscriptionRow.id,
        vehicle_id: vehicleId,
      });

    if (linkError) {
      console.error("Error linking subscription to vehicle:", linkError);
    }
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log("🔄 Subscription updated:", subscription.id);

  const sub = subscription as any;

  const subscriptionItem = sub?.items?.data?.[0];

  const cps = Number(subscriptionItem?.current_period_start);
  const cpe = Number(subscriptionItem?.current_period_end);

  console.log("🔍 Raw billing data from subscription item:", {
    current_period_start: subscriptionItem?.current_period_start,
    current_period_end: subscriptionItem?.current_period_end,
    cps_number: cps,
    cpe_number: cpe,
    is_cps_finite: Number.isFinite(cps),
    is_cpe_finite: Number.isFinite(cpe),
  });

  const currentPeriodStartIso = Number.isFinite(cps)
    ? new Date(cps * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEndIso = Number.isFinite(cpe)
    ? new Date(cpe * 1000).toISOString()
    : null;
  const priceId = sub?.items?.data?.[0]?.price?.id ?? null;
  const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);

  const { error } = await supabase
    .from("user_subscription")
    .update({
      status: subscription.status,
      current_period_start: currentPeriodStartIso,
      current_period_end: currentPeriodEndIso,
      cancel_at_period_end: cancelAtPeriodEnd,
      price_id: priceId,
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log("❌ Subscription deleted:", subscription.id);

  const { error } = await supabase
    .from("user_subscription")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error canceling subscription:", error);
  }
}
