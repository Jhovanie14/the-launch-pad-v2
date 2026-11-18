import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureVehicle } from "@/utils/vehicle";
import { computeBookingAmount } from "@/lib/pricing/computeBookingAmount";
import { buildLineItemUnitAmounts } from "@/lib/pricing/lineItems";
import { validatePromo } from "@/lib/pricing/validatePromo";
import { apiError, ApiError } from "@/lib/http/apiError";
import { logger } from "@/lib/log/logger";
import { validateAppointment } from "@/lib/booking/appointment";
import { customerVehicleId } from "@/lib/booking/customerVehicle";
import { plateError } from "@/lib/booking/plate";
import { assertNotBlocked, CUSTOMER_BLOCKED_BOOKING_MESSAGE } from "@/lib/customers/customerBlocks";

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const body = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Customer checkout only (admins use /api/create-booking-checkout), so the
    // closed-day, past-date and real-slot rules apply without exception.
    const appointmentDate = String(body.appointmentDate ?? "");
    const appointmentTime = String(body.appointmentTime ?? "");
    const notBookable = validateAppointment(appointmentDate, appointmentTime);
    if (notBookable) return apiError(new ApiError(notBookable, 400));

    // Signed-in customers book under their account's email; a guest must give one.
    const email = (user?.email ?? String(body.customerEmail ?? "")).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return apiError(new ApiError("Please enter a valid email address.", 400));
    }
    const plate = String(body.vehicleSpecs?.license_plate ?? "").trim();
    const ownVehicleId = await customerVehicleId(admin, user?.id ?? null, body.vehicleSpecs?.vehicle_id);
    if (!ownVehicleId) {
      const badPlate = plateError(plate);
      if (badPlate) return apiError(new ApiError(badPlate, 400));
    }

    await assertNotBlocked(admin, { email, plates: [plate] }, CUSTOMER_BLOCKED_BOOKING_MESSAGE);

    const servicePackageId: string = body.servicePackageId ?? body.spid ?? "";
    const requestedAddOnIds: string[] = Array.isArray(body.addOns)
      ? body.addOns.map((a: any) => a?.id).filter((id: unknown) => typeof id === "string")
      : [];

    // Authoritative price — client values are ignored.
    const priced = await computeBookingAmount(admin, {
      servicePackageId,
      addOnIds: requestedAddOnIds,
      userId: user?.id ?? null,
      isAuthenticated: !!user,
      paymentMethod: "card",
      vehicle: { plate, vehicleId: ownVehicleId },
      requireActive: true,
    });
    const addOnIds = priced.addOnIds;

    // Server-side promo validation (client-sent discounts are ignored).
    const promo = await validatePromo(admin, {
      code: body.promoCode ?? "",
      baseAmount: priced.amount,
      userId: user?.id ?? null,
      customerEmail: user ? null : email,
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

    // Add-on names and prices for Stripe line-item labels, in the same order
    // as addOnIds so each label matches its amount.
    const { data: addOnRowsRaw } = addOnIds.length
      ? await admin.from("add_ons").select("id, name, price").in("id", addOnIds)
      : { data: [] as any[] };
    const addOnRows = addOnIds
      .map((id) => (addOnRowsRaw ?? []).find((a: any) => a.id === id))
      .filter(Boolean);
    const service = { name: priced.serviceName };

    const unitAmounts = buildLineItemUnitAmounts({
      servicePrice: priced.servicePrice,
      addOnPrices: (addOnRows ?? []).map((a: any) => Number(a.price)),
      discountFactor,
    });

    const lineItems = [
      {
        price_data: {
          currency: "usd",
          product_data: { name: service?.name ?? "Car Wash Service" },
          unit_amount: unitAmounts.serviceCents,
        },
        quantity: 1,
      },
      ...(addOnRows ?? []).map((a: any, i: number) => ({
        price_data: {
          currency: "usd",
          product_data: { name: a.name },
          unit_amount: unitAmounts.addOnCents[i],
        },
        quantity: 1,
      })),
    ];

    const vehicleId = ownVehicleId ?? (await ensureVehicle({ license_plate: plate }));

    const bookingData = {
      uid: user?.id ?? null,
      vid: vehicleId ?? null,
      spid: servicePackageId,
      spn: service?.name ?? "",
      spp: priced.servicePrice,
      aids: addOnIds.join(","),
      ad: appointmentDate,
      at: appointmentTime,
      tp: promo.discountedAmount,
      td: priced.totalDuration,
      em: email,
      nm: String(user?.user_metadata?.full_name ?? body.customerName ?? "").trim().slice(0, 80),
      ph: String(body.customerPhone ?? "").trim().slice(0, 25),
      si: String(body.specialInstructions ?? "").slice(0, 120),
      // Promo used, so the webhook counts it only once payment has succeeded.
      ...(promo.promoId ? { pid: promo.promoId } : {}),
      // Guest marketing opt-in, recorded by the webhook after payment
      // (lib/marketing/bookingConsent.ts). Only present when ticked.
      ...(!user && body.marketingOptIn === true ? { mk: 1 } : {}),
    };

    const bookingJson = JSON.stringify(bookingData);
    if (bookingJson.length > 500) {
      logger.error("Booking metadata too large:", bookingJson.length);
      return apiError(new ApiError("Booking data too large", 400));
    }

    const currentParams = new URLSearchParams({
      license_plate: plate,
      vehicle_id: ownVehicleId ?? "",
      service: servicePackageId,
      addons: addOnIds.join(","),
      date: appointmentDate,
      time: appointmentTime,
    }).toString();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: email,
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
