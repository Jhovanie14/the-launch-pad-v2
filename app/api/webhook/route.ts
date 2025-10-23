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
  const bookingMeta = session.metadata?.booking
    ? JSON.parse(session.metadata.booking)
    : null;

  if (!bookingMeta) return;

  // Check for existing booking by payment_intent_id
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("payment_intent_id", session.payment_intent)
    .maybeSingle();

  if (existingBooking) {
    console.log(
      "Duplicate prevented: Booking already exists for payment_intent:",
      session.payment_intent
    );
    return;
  }

  try {
    const { data: bookingRows, error } = await supabase
      .from("bookings")
      .insert([
        {
          ...bookingMeta,
          payment_intent_id: session.payment_intent,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      // If error is unique constraint violation, ignore
      if (error.code === "23505") {
        console.log("Duplicate booking insert prevented by DB constraint.");
        return;
      }
      console.error("Supabase insert error:", error);
      return;
    }

    console.log("Booking inserted!", bookingRows);

    if (bookingRows && bookingMeta.add_on_ids?.length) {
      const addOnInserts = bookingMeta.add_on_ids.map((addOnId: string) => ({
        booking_id: bookingRows.id,
        add_on_id: addOnId,
      }));

      const { error: addOnError } = await supabase
        .from("booking_add_ons")
        .insert(addOnInserts);

      if (addOnError) {
        console.error("Failed to insert booking add-ons:", addOnError);
      } else {
        console.log("Booking add-ons inserted!");
      }
    }

    // Send confirmation email
    // if (bookingRows?.customer_email) {
    //   await sendBookingConfirmationEmail({
    //     to: bookingRows.customer_email,
    //     customerName: bookingRows.customer_name ?? "Customer",
    //     bookingId: bookingRows.id,
    //     servicePackage: bookingRows.service_package_name ?? "Service",
    //     appointmentDate: bookingRows.appointment_date,
    //     appointmentTime: bookingRows.appointment_time,
    //   });
    // }
  } catch (err) {
    console.error("Booking insert exception:", err);
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

  console.log("Raw billing data from subscription item:", {
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

  console.log("Saving subscription with payload:", {
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

  const sub = subscription as any;
  const subscriptionItem = sub?.items?.data?.[0];

  const cps = Number(subscriptionItem?.current_period_start);
  const cpe = Number(subscriptionItem?.current_period_end);

  const currentPeriodStartIso = Number.isFinite(cps)
    ? new Date(cps * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEndIso = Number.isFinite(cpe)
    ? new Date(cpe * 1000).toISOString()
    : null;

  const priceId = subscriptionItem?.price?.id ?? null;
  const interval = subscriptionItem?.price?.recurring?.interval ?? null; // 👈 capture monthly/yearly
  const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);
  const planId = subscription.metadata?.plan_id ?? null;
  const billingCycleRaw = subscription.metadata?.billing_cycle || null;
  const billingCycle =
    billingCycleRaw === "monthly"
      ? "month"
      : billingCycleRaw === "yearly"
        ? "year"
        : null;

  // 1️⃣ Update user_subscription (no vehicle_id)
  const { data: subscriptionRow, error: subError } = await supabase
    .from("user_subscription")
    .update({
      status: subscription.status,
      current_period_start: currentPeriodStartIso,
      current_period_end: currentPeriodEndIso,
      cancel_at_period_end: cancelAtPeriodEnd,
      price_id: priceId,
      billing_cycle: billingCycle,
      subscription_plan_id: planId,
    })
    .eq("stripe_subscription_id", subscription.id)
    .select()
    .single();

  if (subError) {
    console.error("Error updating subscription:", subError);
    return;
  }

  // 2️⃣ Update subscription_vehicles if vehicle_id exists
  const vehicleId = subscription.metadata?.vehicle_id ?? null;
  if (vehicleId && subscriptionRow?.id) {
    const { data: existingLink } = await supabase
      .from("subscription_vehicles")
      .select("id, vehicle_id")
      .eq("subscription_id", subscriptionRow.id)
      .maybeSingle();

    if (existingLink) {
      // Update existing link
      await supabase
        .from("subscription_vehicles")
        .update({ vehicle_id: vehicleId })
        .eq("subscription_id", subscriptionRow.id);
    } else {
      // Insert new link
      await supabase.from("subscription_vehicles").insert({
        subscription_id: subscriptionRow.id,
        vehicle_id: vehicleId,
      });
    }
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log("Subscription deleted:", subscription.id);

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
