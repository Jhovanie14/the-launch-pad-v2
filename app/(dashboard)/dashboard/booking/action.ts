"use server";

import { createClient } from "@/utils/supabase/server";
import { ServicePackage } from "@/lib/data/services";
import { createAdminClient } from "@/utils/supabase/admin";
import { computeBookingAmount } from "@/lib/pricing/computeBookingAmount";
import { recordPromoRedemption, validatePromo } from "@/lib/pricing/validatePromo";
import { ApiError } from "@/lib/http/apiError";
import { validateAppointment } from "@/lib/booking/appointment";
import { customerVehicleId } from "@/lib/booking/customerVehicle";
import { assertNotBlocked, CUSTOMER_BLOCKED_BOOKING_MESSAGE } from "@/lib/customers/customerBlocks";
import { persistBooking } from "@/lib/booking/persistBooking";

type CarData = {
  // License plate is OPTIONAL
  license_plate?: string;
  // Direct vehicle ID — used as fallback when no plate
  vehicle_id?: string;

  // Booking details
  servicePackage?: ServicePackage;
  addOnsId?: string[] | null;
  appointmentDate?: Date;
  appointmentTime?: string;
  totalPrice?: number;
  totalDuration?: number;
  payment_method: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  specialInstructions?: string;
  promoCode?: string;
};

export type PromoCheck =
  | { ok: true; type: "percent" | "flat"; value: number }
  | { ok: false; message: string };

/**
 * The promo box on the booking page. Checked on the server with the same
 * rules the booking itself uses (lib/pricing/validatePromo), so the browser
 * never reads the promo_codes table and the list of codes stays private.
 * One generic refusal, so the answer does not reveal which codes exist.
 */
export async function checkPromoCode(input: {
  code: string;
  serviceId: string;
  addOnIds?: string[];
  guestEmail?: string;
}): Promise<PromoCheck> {
  const refusal: PromoCheck = {
    ok: false,
    message: "This promo code cannot be used for this booking.",
  };
  const code = String(input.code ?? "").trim().slice(0, 64);
  if (!code || !input.serviceId) return refusal;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();

  let baseAmount: number;
  try {
    const priced = await computeBookingAmount(admin, {
      servicePackageId: String(input.serviceId),
      addOnIds: Array.isArray(input.addOnIds) ? input.addOnIds.map(String) : [],
      userId: user?.id ?? null,
      isAuthenticated: !!user,
      paymentMethod: "card",
      requireActive: true,
    });
    baseAmount = priced.amount;
  } catch {
    return refusal;
  }

  const promo = await validatePromo(admin, {
    code,
    baseAmount: Math.max(baseAmount, 0.01),
    userId: user?.id ?? null,
    customerEmail: user ? null : input.guestEmail ?? null,
    serviceId: String(input.serviceId),
  });
  if (!promo.promoId) return refusal;

  const { data: row } = await admin
    .from("promo_codes")
    .select("discount_type, discount_percent, discount_amount")
    .eq("id", promo.promoId)
    .maybeSingle();
  if (!row) return refusal;
  return row.discount_type === "flat"
    ? { ok: true, type: "flat", value: Number(row.discount_amount) }
    : { ok: true, type: "percent", value: Number(row.discount_percent) };
}

/**
 * Online customer booking paid in cash at the shop, or covered by a
 * membership. Both need a signed-in account. Card bookings never come through
 * here: they are created by the Stripe webhook once payment has succeeded
 * (POST /api/checkout_sessions starts them). Admin bookings go through
 * createAdminBooking in app/admin/booking/action.ts instead.
 *
 * This is a public endpoint, so nothing the browser sends is trusted: the
 * price, service name, duration and add-ons come from the database, the email
 * comes from the account, and the date and time are checked here.
 */
export async function createBooking(car: CarData) {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (car.payment_method !== "cash" && car.payment_method !== "subscription") {
    throw new ApiError("Please pay by card through checkout.", 400);
  }
  if (!currentUser?.email) {
    throw new ApiError("Please sign in to book with cash or your membership.", 401);
  }

  const appointmentDate = car.appointmentDate
    ? new Date(car.appointmentDate).toISOString().split("T")[0]
    : "";
  const appointmentTime = car.appointmentTime ?? "";
  const notBookable = validateAppointment(appointmentDate, appointmentTime);
  if (notBookable) throw new ApiError(notBookable, 400);

  const admin = createAdminClient();
  const plate = car.license_plate?.trim() || null;
  // Only the customer's own car can be booked by id.
  const vehicleId = await customerVehicleId(admin, currentUser.id, car.vehicle_id);

  await assertNotBlocked(
    admin,
    { email: currentUser.email, plates: [plate] },
    CUSTOMER_BLOCKED_BOOKING_MESSAGE
  );

  const priced = await computeBookingAmount(admin, {
    servicePackageId: car.servicePackage?.id ?? "",
    addOnIds: car.payment_method === "subscription" ? [] : (car.addOnsId ?? []),
    userId: currentUser.id,
    isAuthenticated: true,
    paymentMethod: car.payment_method,
    vehicle: { plate, vehicleId },
    requireActive: true,
  });

  // "subscription" requires the plan to actually cover this service and car.
  if (car.payment_method === "subscription" && (!priced.isFree || priced.amount > 0)) {
    throw new ApiError("Your membership does not cover this service for this car.", 400);
  }

  // Apply promo server-side (ignored if invalid). Never on a membership wash.
  const promo =
    car.payment_method === "cash"
      ? await validatePromo(admin, {
          code: car.promoCode ?? "",
          baseAmount: priced.amount,
          userId: currentUser.id,
          serviceId: car.servicePackage?.id ?? "",
        })
      : { discountedAmount: priced.amount, promoId: null };

  // Saved with the service role: everything above has already been checked
  // here, and the database no longer lets a customer's own login insert
  // bookings, add-ons or cars directly (migration 20261118000000).
  const booking = await persistBooking(admin, {
    userId: currentUser.id,
    licensePlate: plate ?? undefined,
    vehicleId: vehicleId ?? undefined,
    servicePackageId: car.servicePackage?.id,
    servicePackageName: priced.serviceName ?? undefined,
    servicePackagePrice: priced.servicePrice,
    addOnIds: priced.addOnIds,
    appointmentDate,
    appointmentTime,
    totalPrice: promo.discountedAmount,
    totalDuration: priced.totalDuration,
    paymentMethod: car.payment_method,
    customerName:
      car.customerName?.trim().slice(0, 120) || currentUser.user_metadata?.full_name || null,
    customerEmail: currentUser.email,
    customerPhone: car.customerPhone?.trim().slice(0, 30),
    notes: car.notes?.slice(0, 1000),
    specialInstructions: car.specialInstructions?.slice(0, 1000),
    claimUnownedVehicle: false,
  });

  // Count the promo use now, on the server, once the booking exists.
  if (promo.promoId) {
    await recordPromoRedemption(admin, {
      promoId: promo.promoId,
      userId: currentUser.id,
      customerEmail: currentUser.email,
    });
  }

  return booking;
}
