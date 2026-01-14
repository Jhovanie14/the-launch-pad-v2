"use server";

import { createClient } from "@/utils/supabase/server";
import { ServicePackage } from "@/lib/data/services";
import { sendBookingConfirmationEmail } from "@/lib/email/sendConfirmation";
import { createAdminClient } from "@/utils/supabase/admin";

type CarData = {
  // License plate is REQUIRED
  license_plate: string;

  // Optional vehicle details
  year?: number;
  make?: string;
  model?: string;
  body_type?: string;
  colors?: string[];

  // Booking details
  price?: number;
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
};

export async function createBooking(car: CarData, subscriberId?: string) {
  const supabase = subscriberId ? createAdminClient() : await createClient();

  if (!car.license_plate || !car.license_plate.trim()) {
    throw new Error("License plate is required");
  }

  // Normalize license plate
  const normalizedPlate = car.license_plate.trim().toUpperCase();

  // Get current user (only needed for non-subscriber bookings)
  let currentUser = null;
  if (!subscriberId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUser = user;
  }

  // Determine which user_id to use
  const targetUserId = subscriberId || currentUser?.id || null;

  console.log("🔍 Booking for:", {
    isWalkIn: !!subscriberId,
    targetUserId,
    currentUser: currentUser?.id,
  });

  // Ensure vehicle exists or insert
  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("license_plate", normalizedPlate)
    .maybeSingle();

  let vehicleId = existing?.id;
  if (!vehicleId) {
    const { data: inserted } = await supabase
      .from("vehicles")
      .insert({
        user_id: targetUserId || null,
        license_plate: normalizedPlate,
      })
      .select("id")
      .single();

    vehicleId = inserted?.id;
  }

  // Insert booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: targetUserId,
      vehicle_id: vehicleId,
      service_package_id: car.servicePackage?.id,
      service_package_name: car.servicePackage?.name,
      service_package_price: car.servicePackage?.price,
      appointment_date: car.appointmentDate?.toISOString().split("T")[0],
      appointment_time: car.appointmentTime,
      total_price: car.totalPrice,
      total_duration: car.totalDuration,
      payment_method: car.payment_method,
      status: "pending",
      customer_name:
        car.customerName || currentUser?.user_metadata?.full_name || null,
      customer_email: car.customerEmail || currentUser?.email || null,
      customer_phone: car.customerPhone || null,
      notes: car.notes || null,
      special_instructions: car.specialInstructions || null,
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !booking) {
    console.error("Booking creation error:", error);
    throw error;
  }

  // Insert selected add-ons into join table
  if (car.addOnsId && car.addOnsId.length > 0) {
    const addOnRows = car.addOnsId.map((addOnId) => ({
      booking_id: booking.id,
      add_on_id: addOnId,
    }));

    console.log("Inserting booking add-ons:", addOnRows);

    const { data, error: addOnError } = await supabase
      .from("booking_add_ons")
      .insert(addOnRows);

    if (addOnError) {
      console.error("Error inserting booking add-ons:", addOnError);
    } else {
      console.log("Successfully inserted booking add-ons:", data);
    }
  }

  let addOnNames: string[] = [];
  if (car.addOnsId && car.addOnsId.length > 0) {
    const { data: addOnsData, error: addOnsError } = await supabase
      .from("add_ons")
      .select("name")
      .in("id", car.addOnsId);

    if (addOnsError) {
      console.error("Error fetching add-on names:", addOnsError);
    } else {
      addOnNames = addOnsData?.map((a) => a.name) || [];
    }
  }

  console.log("EMAIL DEBUG:", {
    bookingEmail: booking.customer_email,
    carEmail: car.customerEmail,
  });

  // Send confirmation email
  if (!booking.customer_email) {
    return null;
  } else if (booking.customer_email) {
    // await sendBookingConfirmationEmail({
    //   to: booking.customer_email,
    //   customerName: booking.customer_name ?? "Customer",
    //   bookingId: booking.id,
    //   servicePackage: booking.service_package_name ?? "Service",
    //   appointmentDate: booking.appointment_date,
    //   appointmentTime: booking.appointment_time,
    //   addOns: addOnNames,
    // });
    try {
      await sendBookingConfirmationEmail({
        to: booking.customer_email || car.customerEmail,
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
  }

  return booking;
}
