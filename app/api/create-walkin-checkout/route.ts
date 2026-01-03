// app/api/create-walkin-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const {
      amount,
      subscriber_id,
      subscription_vehicle_id,
      service_package_id,
      add_on_ids,
      appointment_date,
      appointment_time,
      notes,
      customer_email,
      customer_name,
    } = await req.json();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Walk-In Service Add-Ons",
              description: `Payment for additional services - ${customer_name}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/users?tab=express&payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/users?tab=express&payment=cancelled`,
      metadata: {
        subscriber_id,
        subscription_vehicle_id,
        service_package_id: service_package_id || "",
        add_on_ids: JSON.stringify(add_on_ids),
        appointment_date,
        appointment_time,
        notes: notes || "",
        payment_type: "walkin_booking",
      },
      customer_email,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
