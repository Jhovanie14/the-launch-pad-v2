// utils/vehicle.ts
import { createClient } from "@/utils/supabase/server";

export async function ensureVehicle(vehicle: {
  user_id: string | null;
  year: number;
  make: string;
  model: string;
  body_type?: string;
  colors: string[];
}) {
  const supabase = await createClient();

  // Check if vehicle already exists
  const { data: existing, error: selectError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("user_id", vehicle.user_id)
    .eq("year", vehicle.year)
    .eq("make", vehicle.make)
    .eq("model", vehicle.model)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  if (selectError) {
    console.error("Error selecting vehicle:", selectError);
    throw selectError;
  }
  // Insert new vehicle
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

  if (insertError) throw insertError;

  return inserted?.id;
}
