"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { describeVehicle, type VehicleDisplay } from "@/lib/booking/vehicleDisplay";

export type { VehicleDisplay } from "@/lib/booking/vehicleDisplay";

/**
 * The car shown on the booking confirmation page. This is a public endpoint, so
 * it only describes a car the caller is allowed to see: their own, or one on
 * their membership. For anything else (a guest, or someone else's car) it
 * returns just the plate they typed (see describeVehicle).
 */
export async function getVehicleDisplay(args: {
  licensePlate?: string | null;
  vehicleId?: string | null;
}): Promise<VehicleDisplay | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return describeVehicle(createAdminClient(), user?.id ?? null, args);
}
