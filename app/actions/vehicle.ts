"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { customerVehicleId } from "@/lib/booking/customerVehicle";
import { normalizePlate } from "@/lib/booking/plate";

export interface VehicleDisplay {
  year: number | null;
  make: string | null;
  model: string | null;
  body_type: string | null;
  colors: string[] | null;
  license_plate: string;
}

const COLUMNS = "id, user_id, year, make, model, body_type, colors, license_plate";

/**
 * The car shown on the booking confirmation page. This is a public endpoint, so
 * it only describes a car the caller is allowed to see: their own, or one on
 * their membership. For anything else (a guest, or someone else's car) it
 * returns just the plate they typed, so it cannot be used to look up who drives
 * what, or to turn a vehicle id into a plate.
 */
export async function getVehicleDisplay(args: {
  licensePlate?: string | null;
  vehicleId?: string | null;
}): Promise<VehicleDisplay | null> {
  const plate = normalizePlate(args.licensePlate);
  if (!plate && !args.vehicleId) return null;
  const plateOnly = (p: string): VehicleDisplay => ({
    year: null, make: null, model: null, body_type: null, colors: null, license_plate: p,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return plate ? plateOnly(plate) : null;

  const admin = createAdminClient();
  const { data } = await (plate
    ? admin.from("vehicles").select(COLUMNS).eq("license_plate", plate)
    : admin.from("vehicles").select(COLUMNS).eq("id", args.vehicleId!)
  )
    .limit(1)
    .maybeSingle();
  if (!data) return plate ? plateOnly(plate) : null;

  const allowed = (await customerVehicleId(admin, user.id, data.id)) === data.id;
  if (!allowed) return plate ? plateOnly(plate) : null;

  return {
    year: data.year,
    make: data.make,
    model: data.model,
    body_type: data.body_type,
    colors: data.colors,
    license_plate: data.license_plate,
  };
}
