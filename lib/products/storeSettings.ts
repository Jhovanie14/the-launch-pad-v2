import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";

/**
 * Pickup hours and instructions (never invented: null means "not set") and
 * the unpaid hold.
 */
export interface PickupSettings {
  pickupHours: string | null;
  pickupNote: string | null;
  holdDays: number;
}

export const DEFAULT_HOLD_DAYS = 3;
const MAX_HOURS_LENGTH = 120;
const MAX_NOTE_LENGTH = 200;

export function sanitizePickupSettings(body: unknown): PickupSettings {
  if (!body || typeof body !== "object") throw new ApiError("Invalid settings", 400);
  const { pickup_hours, pickup_note, hold_days } = body as Record<string, unknown>;

  if (pickup_hours != null && typeof pickup_hours !== "string") {
    throw new ApiError("Pickup hours must be text", 400);
  }
  const hours = (pickup_hours ?? "").trim();
  if (hours.length > MAX_HOURS_LENGTH) {
    throw new ApiError(`Keep pickup hours to ${MAX_HOURS_LENGTH} characters`, 400);
  }

  if (pickup_note != null && typeof pickup_note !== "string") {
    throw new ApiError("Pickup instructions must be text", 400);
  }
  const note = (pickup_note ?? "").trim();
  if (note.length > MAX_NOTE_LENGTH) {
    throw new ApiError(`Keep pickup instructions to ${MAX_NOTE_LENGTH} characters`, 400);
  }

  if (typeof hold_days !== "number" || !Number.isInteger(hold_days) || hold_days < 1 || hold_days > 14) {
    throw new ApiError("Hold unpaid orders for 1 to 14 days", 400);
  }

  return { pickupHours: hours || null, pickupNote: note || null, holdDays: hold_days };
}

export async function getPickupSettings(db: SupabaseClient): Promise<PickupSettings> {
  // "*" rather than named columns: before the pickup_note migration is live a
  // named list would fail the whole read and blank the hours too.
  const { data } = await db.from("store_settings").select("*").eq("id", 1).maybeSingle();
  const row = (data ?? {}) as { pickup_hours?: string | null; pickup_note?: string | null; hold_days?: number | null };
  return {
    pickupHours: row.pickup_hours?.trim() || null,
    pickupNote: row.pickup_note?.trim() || null,
    holdDays: row.hold_days ?? DEFAULT_HOLD_DAYS,
  };
}
