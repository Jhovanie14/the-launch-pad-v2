import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();

  // ✅ Get current logged in user (if any)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  //Inser or fetch vehicle first
  const vehicleId = body.vehicleSpecs
    ? await ensureVehicle({
        user_id: user?.id ?? null,
        year: Number(body.vehicleSpecs.year),
        make: body.vehicleSpecs.make,
        model: body.vehicleSpecs.model,
        trim: body.vehicleSpecs.trim,
        body_type: body.vehicleSpecs.body_type,
        colors: [body.vehicleSpecs.color],
      })
    : null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: body.servicePackageName },
          unit_amount: Math.round(Number(body.totalPrice) * 100),
        },
        quantity: 1,
      },
      ...(body.addOns?.map((addon: any) => ({
        price_data: {
          currency: "usd",
          product_data: { name: addon.name },
          unit_amount: Math.round(Number(addon.price) * 100),
        },
        quantity: 1,
      })) || []),
    ],
    customer_email: user?.email ?? body.customerEmail ?? undefined,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/booking/confirmation?cancelled=1`,

    metadata: {
      booking: JSON.stringify({
        user_id: user?.id ?? null,
        vehicle_id: vehicleId ?? "",
        service_package_id: body.servicePackageId,
        service_package_name: body.servicePackageName,
        service_package_price: Number(body.servicePackagePrice),
        add_ons_id: body.addOnsId,
        appointment_date: body.appointmentDate,
        appointment_time: body.appointmentTime,
        total_price: Number(body.totalPrice),
        total_duration: Number(body.totalDuration),
        customer_name: body.customerName ?? null,
        customer_email: user?.email ?? body.customerEmail ?? undefined,
        customer_phone: body.customerPhone ?? null,
        // notes: body.notes ?? null,
        // special_instructions: body.specialInstructions ?? null,
      }),
    },
  });
  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
}
