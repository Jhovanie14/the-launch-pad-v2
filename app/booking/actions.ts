"use server";

import { createClient } from "@/utils/supabase/server";
import { ServicePackage } from "@/lib/data/services";

type CarData = {
  year: number;
  make: string;
  model: string;
  series?: string;
  trim: string;
  body_type?: string;
  colors: string[];
  price?: number;
  servicePackage?: ServicePackage;
  addOnsId?: any[] | null;
  appointmentDate?: Date;
  appointmentTime?: string;
  totalPrice?: number;
  totalDuration?: number;
  // Customer info for non-authenticated users
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
    .eq("year", car.year)
    .eq("make", car.make)
    .eq("model", car.model)
    .eq("trim", car.trim)
    .eq("body_type", car.body_type)
    .contains("colors", car.colors)
    .maybeSingle();

  let vehicleId = existing?.id;
  if (!vehicleId) {
    console.log("Inserting vehicle:", {
      year: car.year,
      make: car.make,
      model: car.model,
      trim: car.trim,
      body_type: car.body_type,
      colors: car.colors,
    });
    const { data: inserted } = await supabase
      .from("vehicles")
      .insert({
        year: car.year,
        make: car.make,
        model: car.model,
        trim: car.trim,
        body_type: car.body_type || "",
        colors: car.colors || [],
      })
      .select("id")
      .single();

    vehicleId = inserted?.id;
  }

  // Create or update user profile if user is authenticated
  if (user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: car.customerName || user.user_metadata?.full_name,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }
  }

  // Create booking with service details
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      user_id: user?.id || null,
      vehicle_id: vehicleId,
      service_package_id: car.servicePackage?.id,
      service_package_name: car.servicePackage?.name,
      service_package_price: car.servicePackage?.price,
      add_ons_id: car.addOnsId?? null,
      appointment_date: car.appointmentDate?.toISOString().split("T")[0], // Store as date only
      appointment_time: car.appointmentTime,
      total_price: car.totalPrice,
      total_duration: car.totalDuration,
      status: "pending",
      customer_name: car.customerName || user?.user_metadata?.full_name || null,
      customer_email: car.customerEmail || user?.email || null,
      customer_phone: car.customerPhone || null,
      notes: car.notes || null,
      special_instructions: car.specialInstructions || null,
      created_at: new Date().toISOString(),
    })
    .select(
      `
        *,
        vehicles (
          year,
          make,
          model,
          trim,
          body_type,
          colors
        )
      `
    )
    .single();

  if (error) {
    console.error("Booking creation error:", error);
    throw error;
  }

  // Create status history entry
  if (booking) {
    await supabase.from("booking_status_history").insert({
      booking_id: booking.id,
      status: "pending",
      notes: "Booking created",
    });
  }

  return booking;
}
