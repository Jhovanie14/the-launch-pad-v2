// utils/vehicle.ts
import { createClient } from "@/utils/supabase/server";

export async function ensureVehicle(vehicle: {
  user_id?: string | null;
  license_plate?: string | null;
  // Optional fields that admin can fill in later
  year?: number | null;
  make?: string | null;
  model?: string | null;
  body_type?: string | null;
  colors?: string[] | null;
}): Promise<string | null> {
  const supabase = await createClient();

  // Normalize license plate (uppercase, trim whitespace) - optional
  const normalizedPlate = vehicle.license_plate?.trim().toUpperCase();

  // If no license plate provided, return null (vehicle won't be created)
  if (!normalizedPlate) {
    return null;
  }
  const { data: existing, error: selectError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("license_plate", normalizedPlate)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error("Error selecting vehicle:", selectError);
    throw selectError;
  }

  // If vehicle exists, return its ID
  if (existing) {
    return existing.id;
  }

  // Insert new vehicle with license plate
  const { data: inserted, error: insertError } = await supabase
    .from("vehicles")
    .insert({
      user_id: vehicle.user_id || null,
      license_plate: normalizedPlate,
      year: vehicle.year || null,
      make: vehicle.make || null,
      model: vehicle.model || null,
      body_type: vehicle.body_type || null,
      colors: vehicle.colors || null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error inserting vehicle:", insertError);
    throw insertError;
  }

  return inserted.id;
}
