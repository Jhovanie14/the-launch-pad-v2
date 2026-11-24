import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";

/** Pickup hours (never invented: null means "not set") and the unpaid hold. */
export interface PickupSettings {
  pickupHours: string | null;
  holdDays: number;
}

export const DEFAULT_HOLD_DAYS = 3;
const MAX_HOURS_LENGTH = 120;

export function sanitizePickupSettings(body: unknown): PickupSettings {
  if (!body || typeof body !== "object") throw new ApiError("Invalid settings", 400);
  const { pickup_hours, hold_days } = body as Record<string, unknown>;

  if (pickup_hours != null && typeof pickup_hours !== "string") {
    throw new ApiError("Pickup hours must be text", 400);
  }
  const hours = (pickup_hours ?? "").trim();
  if (hours.length > MAX_HOURS_LENGTH) {
    throw new ApiError(`Keep pickup hours to ${MAX_HOURS_LENGTH} characters`, 400);
  }

  if (typeof hold_days !== "number" || !Number.isInteger(hold_days) || hold_days < 1 || hold_days > 14) {
    throw new ApiError("Hold unpaid orders for 1 to 14 days", 400);
  }

  return { pickupHours: hours || null, holdDays: hold_days };
}

export async function getPickupSettings(db: SupabaseClient): Promise<PickupSettings> {
  const { data } = await db.from("store_settings").select("pickup_hours, hold_days").eq("id", 1).maybeSingle();
  const row = (data ?? {}) as { pickup_hours?: string | null; hold_days?: number | null };
  return {
    pickupHours: row.pickup_hours?.trim() || null,
    holdDays: row.hold_days ?? DEFAULT_HOLD_DAYS,
  };
}
