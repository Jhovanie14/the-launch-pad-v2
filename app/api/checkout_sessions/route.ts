import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureVehicle } from "@/utils/vehicle";
import { computeBookingAmount } from "@/lib/pricing/computeBookingAmount";
import { validatePromo } from "@/lib/pricing/validatePromo";
import { apiError, ApiError } from "@/lib/http/apiError";
import { logger } from "@/lib/log/logger";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const body = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const servicePackageId: string = body.servicePackageId ?? body.spid ?? "";
    const addOnIds: string[] = Array.isArray(body.addOns)
      ? body.addOns.map((a: any) => a.id).filter(Boolean)
      : [];

    // Authoritative price — client values are ignored.
    const priced = await computeBookingAmount(admin, {
      servicePackageId,
      addOnIds,
      userId: user?.id ?? null,
      isAuthenticated: !!user,
      paymentMethod: "card",
    });

    // Server-side promo validation (client-sent discounts are ignored).
    const promo = await validatePromo(admin, {
      code: body.promoCode ?? "",
      baseAmount: priced.amount,
      userId: user?.id ?? null,
      serviceId: servicePackageId,
    });
    // Distribute the validated discount proportionally across line items.
    const discountFactor =
      priced.amount > 0 ? promo.discountedAmount / priced.amount : 1;

    if (promo.discountedAmount <= 0) {
      return apiError(
        new ApiError(
          "This booking has no balance to charge. Please confirm it as a free booking instead.",
          400
        )
      );
    }

    // Resolve names from DB for Stripe line-item labels.
    const { data: service } = await admin
      .from("service_packages")
      .select("name")
      .eq("id", servicePackageId)
      .maybeSingle();
    const { data: addOnRows } = addOnIds.length
      ? await admin.from("add_ons").select("id, name, price").in("id", addOnIds)
      : { data: [] as any[] };

    const lineItems = [
      {
        price_data: {
          currency: "usd",
          product_data: { name: service?.name ?? "Car Wash Service" },
          unit_amount: Math.round(priced.servicePrice * 100 * discountFactor),
        },
        quantity: 1,
      },
      ...(addOnRows ?? []).map((a: any) => ({
        price_data: {
          currency: "usd",
          product_data: { name: a.name },
          unit_amount: Math.round(Number(a.price) * 100 * discountFactor),
        },
        quantity: 1,
      })),
    ];

    const passedVehicleId = body.vehicleSpecs?.vehicle_id || null;
    const vehicleId = passedVehicleId
      ? passedVehicleId
      : body.vehicleSpecs
        ? await ensureVehicle({ license_plate: body.vehicleSpecs.license_plate })
        : null;

    const bookingData = {
      uid: user?.id ?? null,
      vid: vehicleId ?? null,
      spid: servicePackageId,
      spn: service?.name ?? "",
      spp: priced.servicePrice,
      aids: addOnIds.join(","),
      ad: body.appointmentDate ?? "",
      at: body.appointmentTime ?? "",
      tp: promo.discountedAmount,
      td: body.totalDuration ?? 0,
      em: user?.email ?? body.customerEmail ?? "",
      nm: user?.user_metadata?.full_name ?? body.customerName ?? "",
      ph: body.customerPhone ?? "",
      si: body.specialInstructions ?? "",
    };

    const bookingJson = JSON.stringify(bookingData);
    if (bookingJson.length > 500) {
      logger.error("Booking metadata too large:", bookingJson.length);
      return apiError(new ApiError("Booking data too large", 400));
    }

    const currentParams = new URLSearchParams({
      license_plate: body.vehicleSpecs?.license_plate || "",
      vehicle_id: vehicleId ?? "",
      service: servicePackageId,
      addons: addOnIds.join(","),
      date: body.appointmentDate || "",
      time: body.appointmentTime || "",
    }).toString();

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
      metadata: { booking: bookingJson },
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}
