import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { sendBookingConfirmationEmail } from "@/lib/email/sendConfirmation";

// Shared write path for the customer and admin booking actions. It trusts
// every field it is given, so callers must authorize the request and compute
// the price before calling it. Deliberately not a "use server" module: it is
// only reachable through those two actions, never directly from the browser.

export interface PersistBookingInput {
  userId: string | null;
  licensePlate?: string;
  vehicleId?: string;
  servicePackageId?: string;
  servicePackageName?: string;
  servicePackagePrice: number;
  addOnIds: string[];
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime?: string;
  totalPrice: number;
  totalDuration?: number;
  paymentMethod: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone?: string;
  notes?: string;
  specialInstructions?: string;
  /**
   * Give an ownerless car with this plate to the booking's user. Staff
   * bookings only: membership cars are stored without an owner, so letting a
   * customer's booking claim one would hand them someone else's car.
   */
  claimUnownedVehicle?: boolean;
}

export async function persistBooking(
  db: SupabaseClient,
  input: PersistBookingInput
) {
  // Normalize license plate (optional - only process if provided)
  const normalizedPlate = input.licensePlate?.trim().toUpperCase();

  // Use directly passed vehicle_id as base, then override via plate lookup if plate exists
  let vehicleId: string | null = input.vehicleId ?? null;

  if (normalizedPlate) {
    const { data: existing } = await db
      .from("vehicles")
      .select("id, user_id")
      .eq("license_plate", normalizedPlate)
      .maybeSingle();

    vehicleId = existing?.id || null;

    if (!vehicleId) {
      const { data: inserted } = await db
        .from("vehicles")
        .insert({ user_id: input.userId, license_plate: normalizedPlate })
        .select("id")
        .single();
      vehicleId = inserted?.id || null;
    } else if (input.claimUnownedVehicle !== false && !existing?.user_id && input.userId) {
      // Link unowned vehicle to the booking's user
      await db
        .from("vehicles")
        .update({ user_id: input.userId })
        .eq("id", vehicleId);
    }
  }

  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      user_id: input.userId,
      vehicle_id: vehicleId,
      service_package_id: input.servicePackageId,
      service_package_name: input.servicePackageName,
      service_package_price: input.servicePackagePrice,
      appointment_date: input.appointmentDate,
      appointment_time: input.appointmentTime,
      total_price: input.totalPrice,
      total_duration: input.totalDuration,
      payment_method: input.paymentMethod,
      status: "pending",
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone || null,
      notes: input.notes || null,
      special_instructions: input.specialInstructions || null,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !booking) {
    console.error("Booking creation error:", error);
    throw error;
  }

  if (input.addOnIds.length > 0) {
    const { error: addOnError } = await db.from("booking_add_ons").insert(
      input.addOnIds.map((addOnId) => ({
        booking_id: booking.id,
        add_on_id: addOnId,
      }))
    );
    if (addOnError) {
      console.error("Error inserting booking add-ons:", addOnError);
    }
  }

  // The confirmation email is sent after the response, so the customer is
  // not kept waiting on the add-on names and Resend (it used to be awaited
  // here, before they saw their booking). A failure is only logged, as before.
  if (booking.customer_email) {
    const addOnIds = input.addOnIds;
    after(async () => {
      try {
        let addOnNames: string[] = [];
        if (addOnIds.length > 0) {
          const { data: addOnsData, error: addOnsError } = await db
            .from("add_ons")
            .select("name")
            .in("id", addOnIds);
          if (addOnsError) console.error("Error fetching add-on names:", addOnsError);
          else addOnNames = addOnsData?.map((a) => a.name) || [];
        }
        await sendBookingConfirmationEmail({
          to: booking.customer_email,
          customerName: booking.customer_name ?? "Customer",
          bookingId: booking.id,
          servicePackage: booking.service_package_name ?? "Service",
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time,
          addOns: addOnNames,
        });
      } catch (emailErr) {
        console.error("Error sending booking confirmation email:", emailErr);
      }
    });
  }

  return booking;
}
