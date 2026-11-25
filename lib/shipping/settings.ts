import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";
import { DEFAULT_POUCH, type Pouch } from "./parcel";
import { isKnownState } from "./states";

export interface ShippingSettings {
  pouches: Pouch[];
  excludedStates: string[];
}

const MAX_POUCHES = 5;
const DIMENSIONS = ["length_in", "width_in", "height_in", "max_weight_oz"] as const;

function isPouch(p: unknown): p is Pouch {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    o.name.trim().length > 0 &&
    DIMENSIONS.every((k) => typeof o[k] === "number" && (o[k] as number) > 0 && (o[k] as number) <= 999)
  );
}

/** Admin input for the Shipping settings panel. Throws ApiError(400) with a readable message. */
export function sanitizeShippingSettings(body: unknown): ShippingSettings {
  if (!body || typeof body !== "object") throw new ApiError("Invalid settings", 400);
  const { pouches, excluded_states } = body as Record<string, unknown>;

  if (!Array.isArray(pouches) || pouches.length === 0) throw new ApiError("Add at least one pouch", 400);
  if (pouches.length > MAX_POUCHES) throw new ApiError(`Up to ${MAX_POUCHES} pouches`, 400);
  const clean = pouches.map((p, i) => {
    if (!isPouch(p)) throw new ApiError(`Pouch ${i + 1}: give it a name and sizes between 0 and 999`, 400);
    return {
      name: p.name.trim().slice(0, 40),
      length_in: p.length_in,
      width_in: p.width_in,
      height_in: p.height_in,
      max_weight_oz: p.max_weight_oz,
    };
  });

  const states = Array.isArray(excluded_states) ? excluded_states : [];
  const codes = states.map((s) => {
    const c = String(s ?? "").trim().toUpperCase();
    if (!isKnownState(c)) throw new ApiError(`Unknown state: ${c}`, 400);
    return c;
  });

  return { pouches: clean, excludedStates: [...new Set(codes)] };
}

/**
 * Pouches and excluded states. Selects "*" so the read still works before the
 * shipping migration is live; anything missing or malformed falls back.
 */
export async function getShippingSettings(db: SupabaseClient): Promise<ShippingSettings> {
  const { data } = await db.from("store_settings").select("*").eq("id", 1).maybeSingle();
  const row = (data ?? {}) as { shipping_pouches?: unknown; shipping_excluded_states?: unknown };
  const pouches = Array.isArray(row.shipping_pouches) && row.shipping_pouches.every(isPouch) && row.shipping_pouches.length > 0
    ? (row.shipping_pouches as Pouch[])
    : [DEFAULT_POUCH];
  const excludedStates = Array.isArray(row.shipping_excluded_states)
    ? row.shipping_excluded_states.filter((s): s is string => typeof s === "string")
    : [];
  return { pouches, excludedStates };
}
