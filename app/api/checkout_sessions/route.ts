import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { ensureVehicle } from "@/utils/vehicle";

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();

  // Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Insert or fetch vehicle
  const vehicleId = body.vehicleSpecs
    ? await ensureVehicle({
        user_id: user?.id ?? null,
        year: Number(body.vehicleSpecs.year),
        make: body.vehicleSpecs.make,
        model: body.vehicleSpecs.model,
        body_type: body.vehicleSpecs.body_type,
        colors: [body.vehicleSpecs.color],
      })
    : null;

  // Prepare line items for Stripe
  const lineItems = [
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
  ];

  // Minimal metadata to avoid 500-char limit
  const metadata = {
    user_id: user?.id ?? null,
    vehicle_id: vehicleId ?? "",
    service_package_id: body.servicePackageId ?? "",
    add_ons_ids: body.addOnsId?.join(",") ?? "", // comma-separated IDs
    appointment_date: body.appointmentDate ?? "",
    appointment_time: body.appointmentTime ?? "",
    total_price: Math.round(Number(body.totalPrice)).toString(),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: user?.email ?? body.customerEmail ?? undefined,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/booking/confirmation?cancelled=1`,
      metadata,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return new Response(JSON.stringify({ error: "Stripe checkout failed" }), {
      status: 500,
    });
  }
}
