// app/api/create-booking-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { computeBookingAmount } from "@/lib/pricing/computeBookingAmount";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase, createAdminClient());
    const {
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

    const addOnIds: string[] = Array.isArray(add_on_ids)
      ? add_on_ids
      : typeof add_on_ids === "string" && add_on_ids
        ? add_on_ids.split(",")
        : [];

    const priced = await computeBookingAmount(createAdminClient(), {
      servicePackageId: service_package_id ?? "",
      addOnIds,
      userId: null,
      isAuthenticated: false,
      paymentMethod: "card",
    });

    if (priced.amount <= 0) {
      return apiError(new ApiError("Nothing to charge for this booking", 400));
    }

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
            unit_amount: Math.round(priced.amount * 100), // Convert to cents
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
  } catch (err) {
    return apiError(err);
  }
}
