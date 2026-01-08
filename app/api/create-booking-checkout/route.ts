// app/api/create-booking-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const {
      amount,
      customer_name,
      customer_email,
      customer_phone,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_color,
      vehicle_body_type,
      // vehicle_license_plate,
      service_package_id,
      add_on_ids,
      appointment_date,
      appointment_time,
    } = await req.json();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Car Wash Service Booking",
              description: `Booking for ${customer_name}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/booking?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/booking?payment=cancelled`,
      metadata: {
        customer_name,
        customer_email,
        customer_phone: customer_phone || "",
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_color,
        vehicle_body_type,
        // vehicle_license_plate: vehicle_license_plate || "",
        service_package_id: service_package_id || "",
        add_on_ids,
        appointment_date,
        appointment_time,
        payment_type: "new_booking",
      },
      customer_email,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
