// utils/vehicle.ts
import { createClient } from "@/utils/supabase/server";

export async function ensureVehicle(vehicle: {
  year: number;
  make: string;
  model: string;
  trim?: string;
  body_type?: string;
  colors: string[];
}) {
  const supabase = await createClient();

  // Check if vehicle already exists
  const { data: existing, error: fetchError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("year", vehicle.year)
    .eq("make", vehicle.make)
    .eq("model", vehicle.model)
    .eq("trim", vehicle.trim)
    .eq("body_type", vehicle.body_type)
    .contains("colors", vehicle.colors)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    return existing.id; // return the existing vehicle id
  }

  // Insert new vehicle
  const { data: inserted, error: insertError } = await supabase
    .from("vehicles")
    .insert({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      body_type: vehicle.body_type || "",
      colors: vehicle.colors || [],
    })
    .select("id")
    .single();

  if (insertError) throw insertError;

  return inserted?.id;
}
