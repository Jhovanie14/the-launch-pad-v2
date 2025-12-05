import { sendBookingConfirmationEmail } from "@/lib/email/sendConfirmation";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Ensure Node.js runtime for Stripe webhooks (required for crypto operations)
export const runtime = "nodejs";

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
    // Subscription & Booking Events
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;

    // Fleet Invoice Events
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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
    if (session.metadata?.plan_type === "self_service") {
      await processSelfServiceSubscription(session);
    } else {
      await processSubscription(session);
    }
  }
}

async function processBooking(session: Stripe.Checkout.Session) {
  const bookingMeta = session.metadata?.booking
    ? JSON.parse(session.metadata.booking)
    : null;

  console.log("Parsed booking metadata:", bookingMeta);

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
          user_id: bookingMeta.uid || null,
          vehicle_id: bookingMeta.vid || null,
          service_package_id: bookingMeta.spid || null,
          service_package_name: bookingMeta.spn || null,
          service_package_price: bookingMeta.spp || null,
          appointment_date: bookingMeta.ad || null,
          appointment_time: bookingMeta.at || null,
          total_price: bookingMeta.tp || 0,
          total_duration: bookingMeta.td || 0,
          payment_method: "card",
          payment_intent_id: session.payment_intent,
          status: "pending",
          customer_name: bookingMeta.nm || null,
          customer_email: bookingMeta.em || null,
          customer_phone: bookingMeta.ph || null,
          notes: null,
          special_instructions: bookingMeta.si || null,
          created_at: new Date().toISOString(),
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

    let addOnIds: string[] = [];

    if (bookingMeta.aids) {
      addOnIds = bookingMeta.aids.split(",").filter((id: string) => id.trim());
    } else if (bookingMeta.addOns?.length) {
      addOnIds = bookingMeta.addOns.map((a: any) => a.id);
    }

    // 🟩 Insert add-ons if found
    if (bookingRows && addOnIds.length > 0) {
      const addOnInserts = addOnIds.map((addOnId: string) => ({
        booking_id: bookingRows.id,
        add_on_id: addOnId.trim(),
      }));

      const { error: addOnError } = await supabase
        .from("booking_add_ons")
        .insert(addOnInserts);

      if (addOnError) {
        console.error("Failed to insert booking add-ons:", addOnError);
      } else {
        console.log("Booking add-ons inserted!", addOnInserts);
      }
    }

    let addOnNames: string[] = [];
    if (bookingMeta.aids) {
      const addOnIds = bookingMeta.aids
        .split(",")
        .filter((id: string) => id.trim());

      const { data: addOnsData } = await supabase
        .from("add_ons")
        .select("name")
        .in("id", addOnIds);

      addOnNames = addOnsData?.map((a) => a.name) || [];
    }

    // Send confirmation email
    if (bookingRows?.customer_email) {
      await sendBookingConfirmationEmail({
        to: bookingRows.customer_email,
        customerName: bookingRows.customer_name ?? "Customer",
        bookingId: bookingRows.id,
        servicePackage: bookingRows.service_package_name ?? "Service",
        appointmentDate: bookingRows.appointment_date,
        appointmentTime: bookingRows.appointment_time,
        addOns: addOnNames,
      });
    }
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
  
  // Support both legacy single vehicle_id and new vehicle_ids format
  const vehicleIdsStr = session.metadata?.vehicle_ids || session.metadata?.vehicle_id || null;
  const vehicleIds = vehicleIdsStr
    ? vehicleIdsStr.split(",").filter((id: string) => id.trim())
    : [];

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
  const subscriptionItems = sub?.items?.data || [];
  
  // Use the first subscription item for period dates (all items share the same period)
  const subscriptionItem = subscriptionItems[0];

  const cps = Number(subscriptionItem?.current_period_start);
  const cpe = Number(subscriptionItem?.current_period_end);

  console.log("Raw billing data from subscription item:", {
    current_period_start: subscriptionItem?.current_period_start,
    current_period_end: subscriptionItem?.current_period_end,
    cps_number: cps,
    cpe_number: cpe,
    is_cps_finite: Number.isFinite(cps),
    is_cpe_finite: Number.isFinite(cpe),
    line_items_count: subscriptionItems.length,
  });

  const currentPeriodStartIso = Number.isFinite(cps)
    ? new Date(cps * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEndIso = Number.isFinite(cpe)
    ? new Date(cpe * 1000).toISOString()
    : null;

  // Use the first price ID as the primary price (for backward compatibility)
  const priceId = subscriptionItems[0]?.price?.id ?? null;
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
    vehicle_ids: vehicleIds,
    vehicle_count: vehicleIds.length,
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

  // Link all vehicles if provided
  if (vehicleIds.length > 0 && subscriptionRow?.id) {
    // First, check for existing vehicle links to avoid duplicates
    const { data: existingLinks } = await supabase
      .from("subscription_vehicles")
      .select("vehicle_id")
      .eq("subscription_id", subscriptionRow.id);

    const existingVehicleIds = new Set(
      existingLinks?.map((link) => link.vehicle_id) || []
    );

    // Insert only new vehicle links
    const newVehicleLinks = vehicleIds
      .filter((vid: string) => !existingVehicleIds.has(vid))
      .map((vehicleId: string) => ({
        subscription_id: subscriptionRow.id,
        vehicle_id: vehicleId.trim(),
      }));

    if (newVehicleLinks.length > 0) {
      const { error: linkError } = await supabase
        .from("subscription_vehicles")
        .insert(newVehicleLinks);

      if (linkError) {
        console.error("Error linking subscription to vehicles:", linkError);
      } else {
        console.log(
          `Successfully linked ${newVehicleLinks.length} vehicle(s) to subscription`
        );
      }
    }
  }
}

async function processSelfServiceSubscription(
  session: Stripe.Checkout.Session
) {
  if (!session.subscription || !session.customer) return;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const appUserId = session.metadata?.app_user_id || null;
  const planId = session.metadata?.plan_id || null;
  const vehicleId = session.metadata?.vehicle_id || null;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );
  const subscriptionItem = subscription.items.data[0];
  const cps = Number(subscriptionItem.current_period_start);
  const cpe = Number(subscriptionItem.current_period_end);

  const currentPeriodStartIso = Number.isFinite(cps)
    ? new Date(cps * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEndIso = Number.isFinite(cpe)
    ? new Date(cpe * 1000).toISOString()
    : null;

  // Upsert self-service subscription
  const { data, error } = await supabase
    .from("self_service_subscriptions")
    .upsert(
      {
        user_id: appUserId,
        self_service_plan_id: planId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: session.customer,
        status: subscription.status,
        current_period_start: currentPeriodStartIso,
        current_period_end: currentPeriodEndIso,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" }
    )
    .select()
    .single();

  if (error) console.error("Error saving self-service subscription:", error);
  else console.log("Self-service subscription saved!", data);

  if (vehicleId && data?.id) {
    const { error: linkError } = await supabase
      .from("self_service_subscription_vehicles")
      .insert({
        subscription_id: data.id,
        vehicle_id: vehicleId,
      });

    if (linkError)
      console.error(
        "Error linking self-service subscription to vehicle:",
        linkError
      );
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

  const { data: existingSub } = await supabase
    .from("user_subscription")
    .select("subscription_plan_id, billing_cycle")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  const priceId = subscriptionItem?.price?.id ?? null;
  const cancelAtPeriodEnd = Boolean(sub?.cancel_at_period_end);
  const planId =
    subscription.metadata?.plan_id ?? existingSub?.subscription_plan_id ?? null;
  const billingCycleRaw = subscription.metadata?.billing_cycle || null;
  const billingCycle =
    billingCycleRaw === "monthly"
      ? "month"
      : billingCycleRaw === "yearly"
        ? "year"
        : (existingSub?.billing_cycle ?? null);

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

// ========================================
// FLEET INVOICE HANDLERS
// ========================================
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const { data, error } = await supabase
    .from("fleet_invoices")
    .update({
      status: "paid",
      payment_date: new Date().toISOString(),
    })
    .eq("stripe_invoice_id", invoice.id);

  console.log("Invoice found in DB:", data);

  if (error) {
    console.error("Failed to update invoice:", error);
  } else {
    console.log(`✅ Invoice ${invoice.id} marked as paid`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { error } = await supabase
    .from("fleet_invoices")
    .update({
      status: "overdue",
    })
    .eq("stripe_invoice_id", invoice.id);

  if (error) {
    console.error("Failed to update invoice:", error);
  } else {
    console.log(`⚠️ Invoice ${invoice.id} payment failed`);
  }
}
