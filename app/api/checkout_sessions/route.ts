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
  // const lineItems = [
  //   {
  //     price_data: {
  //       currency: "usd",
  //       product_data: { name: body.servicePackageName },
  //       unit_amount: Math.round(Number(body.servicePackagePrice) * 100),
  //     },
  //     quantity: 1,
  //   },
  //   ...(body.addOns?.map((addon: any) => ({
  //     price_data: {
  //       currency: "usd",
  //       product_data: { name: addon.name },
  //       unit_amount: Math.round(Number(addon.price) * 100),
  //     },
  //     quantity: 1,
  //   })) || []),
  // ];
  // ============================================
  // HOLIDAY SALE: START - This handles discount factor calculation
  // ============================================
  // Calculate discount factor based on discounted totalPrice vs original prices
  const originalTotal =
    body.servicePackagePrice +
    (body.addOns?.reduce((s: number, a: any) => s + a.price, 0) || 0);
  
  // Safety check: avoid division by zero
  const discountFactor = originalTotal > 0 
    ? body.totalPrice / originalTotal
    : 1;
  // ============================================
  // HOLIDAY SALE: END - The discount factor calculation above is fine to keep
  // as it automatically handles any discount applied in the frontend
  // ============================================

  const lineItems = [
    {
      price_data: {
        currency: "usd",
        product_data: { name: body.servicePackageName },
        unit_amount: Math.round(
          Number(body.servicePackagePrice) * 100 * discountFactor
        ),
      },
      quantity: 1,
    },
    ...(body.addOns?.map((addon: any) => ({
      price_data: {
        currency: "usd",
        product_data: { name: addon.name },
        unit_amount: Math.round(Number(addon.price) * 100 * discountFactor),
      },
      quantity: 1,
    })) || []),
  ];

  const aids =
    body.addOnsId?.join(",") ??
    body.addOns?.map((a: any) => a.id).join(",") ??
    "";

  const year = body.vehicleSpecs?.year?.toString() || "";
  const make = body.vehicleSpecs?.make || "";
  const model = body.vehicleSpecs?.model || "";
  const body_type = body.vehicleSpecs?.body_type || "";
  const color = body.vehicleSpecs?.color || "";
  const service = body.servicePackageId || "";
  const addons = aids || "";
  const date = body.appointmentDate || "";
  const time = body.appointmentTime || "";

  const currentParams = new URLSearchParams({
    year,
    make,
    model,
    body_type,
    color,
    service,
    addons,
    date,
    time,
  }).toString();

  // Prepare booking data for webhook
  const bookingData = {
    uid: user?.id ?? null,
    vid: vehicleId ?? null,
    spid: body.servicePackageId ?? "",
    spn: body.servicePackageName ?? "",
    spp: body.servicePackagePrice ?? 0,
    aids: aids, // Comma-separated is smaller than array
    ad: body.appointmentDate ?? "",
    at: body.appointmentTime ?? "",
    tp: Number(parseFloat(body.totalPrice).toFixed(2)),
    td: body.totalDuration ?? 0,
    em: user?.email ?? body.customerEmail ?? "",
    nm: user?.user_metadata.full_name ?? body.customerName ?? "",
    ph: body.customerPhone ?? "",
    si: body.specialInstructions ?? "",
  };

  // Stringify and check size
  const bookingJson = JSON.stringify(bookingData);

  if (bookingJson.length > 500) {
    console.error("Booking metadata too large:", bookingJson.length, "chars");
    return new Response(
      JSON.stringify({ error: "Booking data too large for processing" }),
      { status: 400 }
    );
  }

  const metadata = {
    booking: bookingJson, // Wrap in 'booking' key for webhook
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: user?.email ?? body.customerEmail ?? undefined,
      success_url: user?.id
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/bookings/success?session_id={CHECKOUT_SESSION_ID}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: user?.id
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/booking/confirmation?${currentParams}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/confirmation?${currentParams}`,
      metadata,
    });
    ``;

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return new Response(JSON.stringify({ error: "Stripe checkout failed" }), {
      status: 500,
    });
  }
}
