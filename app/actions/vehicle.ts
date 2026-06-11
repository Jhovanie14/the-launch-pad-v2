"use server";

import { createAdminClient } from "@/utils/supabase/admin";

export interface VehicleDisplay {
  year: number | null;
  make: string | null;
  model: string | null;
  body_type: string | null;
  colors: string[] | null;
  license_plate: string;
}

/**
 * Look up a vehicle's display info by plate or id using the service-role client.
 * Used by booking confirmation pages so the client no longer reads the vehicles
 * table directly (which lets us tighten vehicles RLS).
 */
export async function getVehicleDisplay(args: {
  licensePlate?: string | null;
  vehicleId?: string | null;
}): Promise<VehicleDisplay | null> {
  const { licensePlate, vehicleId } = args;
  if (!licensePlate && !vehicleId) return null;

  const admin = createAdminClient();
  const query = admin
    .from("vehicles")
    .select("year, make, model, body_type, colors, license_plate");

  const { data } = await (licensePlate
    ? query.eq("license_plate", licensePlate)
    : query.eq("id", vehicleId)
  ).maybeSingle();

  return (data as VehicleDisplay) ?? null;
}
