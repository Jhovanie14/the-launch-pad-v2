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
  }
  return new Response("ok", { status: 200 });
}
