"use server";

import { createClient } from "@/utils/supabase/server";
import { ServicePackage } from "@/lib/data/services";
import { createAdminClient } from "@/utils/supabase/admin";
import { computeBookingAmount } from "@/lib/pricing/computeBookingAmount";
import { validatePromo } from "@/lib/pricing/validatePromo";
import { ApiError } from "@/lib/http/apiError";
import {
  DETAILING_CLOSED_MESSAGE,
  isDetailingOpenOn,
} from "@/lib/booking/detailingDays";
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

/**
 * Online customer booking (guest or signed-in). Runs as the caller's own
 * session and never trusts client prices. Admin bookings go through
 * createAdminBooking in app/admin/booking/action.ts instead.
 */
export async function createBooking(car: CarData) {
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const appointmentDate = car.appointmentDate?.toISOString().split("T")[0];
  if (!appointmentDate || !isDetailingOpenOn(appointmentDate)) {
    throw new ApiError(DETAILING_CLOSED_MESSAGE, 400);
  }

  const admin = createAdminClient();
  const isAuthenticated = !!currentUser;
  const priced = await computeBookingAmount(admin, {
    servicePackageId: car.servicePackage?.id ?? "",
    addOnIds: car.addOnsId ?? [],
    userId: currentUser?.id ?? null,
    isAuthenticated,
    paymentMethod: car.payment_method as "card" | "cash" | "subscription",
  });

  // Guests cannot pay cash; "subscription" requires an actually-free result.
  if (car.payment_method === "cash" && !isAuthenticated) {
    throw new ApiError("Cash payment requires an account", 400);
  }
  if (car.payment_method === "subscription" && !priced.isFree) {
    throw new ApiError("No active subscription covers this service", 400);
  }

  // Apply promo server-side (ignored if invalid).
  const promo = await validatePromo(admin, {
    code: car.promoCode ?? "",
    baseAmount: priced.amount,
    userId: currentUser?.id ?? null,
    serviceId: car.servicePackage?.id ?? "",
  });

  return persistBooking(supabase, {
    userId: currentUser?.id ?? null,
    licensePlate: car.license_plate,
    vehicleId: car.vehicle_id,
    servicePackageId: car.servicePackage?.id,
    servicePackageName: car.servicePackage?.name,
    servicePackagePrice: priced.servicePrice,
    addOnIds: car.addOnsId ?? [],
    appointmentDate,
    appointmentTime: car.appointmentTime,
    totalPrice: promo.discountedAmount,
    totalDuration: car.totalDuration,
    paymentMethod: car.payment_method,
    customerName:
      car.customerName || currentUser?.user_metadata?.full_name || null,
    customerEmail: car.customerEmail || currentUser?.email || null,
    customerPhone: car.customerPhone,
    notes: car.notes,
    specialInstructions: car.specialInstructions,
  });
}
