"use server";

import { createClient } from "@/utils/supabase/server";
import { ServicePackage } from "@/lib/data/services";
import { sendBookingConfirmationEmail } from "@/lib/email/sendConfirmation";

type CarData = {
  year: number;
  make: string;
  model: string;
  series?: string;
  body_type?: string;
  colors: string[];
  price?: number;
  servicePackage?: ServicePackage;
  addOnsId?: string[] | null; // array of add-on UUIDs
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

export async function createBooking(car: CarData) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ensure vehicle exists or insert
  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", user?.id)
    .eq("year", car.year)
    .eq("make", car.make)
    .eq("model", car.model)
    .eq("body_type", car.body_type)
    .contains("colors", car.colors)
    .maybeSingle();

  let vehicleId = existing?.id;
  if (!vehicleId) {
    const { data: inserted } = await supabase
      .from("vehicles")
      .insert({
        user_id: user?.id || null,
        year: car.year,
        make: car.make,
        model: car.model,
        body_type: car.body_type || "",
        colors: car.colors || [],
      })
      .select("id")
      .single();

    vehicleId = inserted?.id;
  }

  // Update user profile if authenticated
  if (user) {
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: car.customerName || user.user_metadata?.full_name,
      updated_at: new Date().toISOString(),
    });
  }

  // Insert booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: user?.id || null,
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
      customer_name: car.customerName || user?.user_metadata?.full_name || null,
      customer_email: car.customerEmail || user?.email || null,
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

  // Send confirmation email
  if (booking.customer_email) {
    await sendBookingConfirmationEmail({
      to: booking.customer_email,
      customerName: booking.customer_name ?? "Customer",
      bookingId: booking.id,
      servicePackage: booking.service_package_name ?? "Service",
      appointmentDate: booking.appointment_date,
      appointmentTime: booking.appointment_time,
    });
  }

  return booking;
}
