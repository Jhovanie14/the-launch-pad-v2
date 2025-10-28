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

  let existingQuery = supabase.from("vehicles").select("id");

  // Only filter by user_id if provided
  if (vehicle.user_id) {
    existingQuery = existingQuery.eq("user_id", vehicle.user_id);
  }

  const { data: existing, error: selectError } = await existingQuery
    .eq("year", vehicle.year)
    .eq("make", vehicle.make)
    .eq("model", vehicle.model)
    .maybeSingle();

  if (selectError) {
    console.error("Error selecting vehicle:", selectError);
    throw selectError;
  }
  if (existing) return existing.id;

  // Insert new vehicle
  const { data: inserted, error: insertError } = await supabase
    .from("vehicles")
    .insert({
      user_id: vehicle.user_id || undefined, // <-- undefined instead of null
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      body_type: vehicle.body_type || "",
      colors: vehicle.colors || [],
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  return inserted?.id;
}
