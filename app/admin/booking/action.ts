"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { AuthError, requireAdmin } from "@/lib/auth/guards";
import { ApiError } from "@/lib/http/apiError";
import { computeAdminBookingAmount } from "@/lib/pricing/adminBookingAmount";
import { persistBooking } from "@/lib/booking/persistBooking";

export type AdminBookingInput = {
  license_plate?: string;
  vehicle_id?: string;
  servicePackageId: string;
  servicePackageName?: string;
  addOnsId?: string[];
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime?: string;
  totalDuration?: number;
  payment_method: "cash" | "subscription";
  discountPercent?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
};

export type AdminBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

/**
 * Booking created by staff from the admin dashboard (New Booking, Walk-In).
 * Admin-only; the price is recomputed here, never taken from the browser.
 * Closed detailing days are allowed so staff can book an exception by hand.
 *
 * Returns a result instead of throwing: Next.js hides thrown server-action
 * messages in production, and staff need to see why a booking was refused.
 */
export async function createAdminBooking(
  input: AdminBookingInput,
  subscriberId?: string
): Promise<AdminBookingResult> {
  try {
    const admin = createAdminClient();
    await requireAdmin(await createClient(), admin);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentDate ?? "")) {
      throw new ApiError("Please select an appointment date", 400);
    }
    if (
      input.payment_method !== "cash" &&
      input.payment_method !== "subscription"
    ) {
      throw new ApiError("Unsupported payment method", 400);
    }

    const addOnIds = input.addOnsId ?? [];
    const priced = await computeAdminBookingAmount(admin, {
      servicePackageId: input.servicePackageId,
      addOnIds,
      subscriberId: subscriberId ?? null,
      paymentMethod: input.payment_method,
      discountPercent: input.discountPercent,
    });

    const booking = await persistBooking(admin, {
      // Booked for the subscriber, or for nobody — never the admin's account.
      userId: subscriberId ?? null,
      licensePlate: input.license_plate,
      vehicleId: input.vehicle_id,
      servicePackageId: input.servicePackageId,
      servicePackageName: input.servicePackageName,
      servicePackagePrice: priced.servicePrice,
      addOnIds,
      appointmentDate: input.appointmentDate,
      appointmentTime: input.appointmentTime,
      totalPrice: priced.total,
      totalDuration: input.totalDuration,
      paymentMethod: input.payment_method,
      customerName: input.customerName || null,
      customerEmail: input.customerEmail || null,
      customerPhone: input.customerPhone,
      notes: input.notes,
    });

    return { ok: true, bookingId: booking.id };
  } catch (err) {
    if (err instanceof ApiError || err instanceof AuthError) {
      return { ok: false, error: err.message };
    }
    console.error("Admin booking creation failed:", err);
    return { ok: false, error: "Failed to create booking." };
  }
}
