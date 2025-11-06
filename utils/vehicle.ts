// utils/vehicle.ts
import { createClient } from "@/utils/supabase/server";

export async function ensureVehicle(vehicle: {
  user_id?: string | null;
  year: number;
  make: string;
  model: string;
  body_type?: string;
  colors: string[];
}) {
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from("vehicles")
    .select("id")
    .eq("year", vehicle.year)
    .eq("make", vehicle.make)
    .eq("model", vehicle.model);

  // Only match user if logged in
  if (vehicle.user_id) {
    query = query.eq("user_id", vehicle.user_id);
  } else {
    // For guests, do not search globally — skip lookup entirely
    // to always create a fresh "guest" vehicle entry
    const { data: inserted, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        user_id: null,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        body_type: vehicle.body_type || "",
        colors: vehicle.colors || [],
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting guest vehicle:", insertError);
      throw insertError;
    }

    return inserted.id;
  }

  // For logged-in users: check if exists
  const { data: existing, error: selectError } = await query.limit(1);

  if (selectError) {
    console.error("Error selecting vehicle:", selectError);
    throw selectError;
  }

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Insert new vehicle for user
  const { data: inserted, error: insertError } = await supabase
    .from("vehicles")
    .insert({
      user_id: vehicle.user_id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      body_type: vehicle.body_type || "",
      colors: vehicle.colors || [],
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error inserting vehicle:", insertError);
    throw insertError;
  }

  return inserted.id;
}
