import { MAX_VEHICLES_PER_SUBSCRIPTION } from "@/lib/pricing/flockPricing";

/**
 * The membership cart a guest leaves behind when they go to sign in. Only the
 * plates travel: the agreement is asked for again after sign-in, because the
 * price can change once we know the account (the first-membership offer).
 */
export const PENDING_CART_KEY = "pendingSubscriptionCart";

export function pendingCartPayload(
  plates: string[],
  planId: string | null,
  billing: "monthly" | "yearly"
): string {
  return JSON.stringify({
    vehicles: plates.map((license_plate) => ({ license_plate })),
    planId,
    billingCycle: billing,
  });
}

/** The plates to put back in the cart, or null when there is nothing usable. */
export function restorePendingCart(raw: string | null): { plates: string[] } | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const vehicles: unknown = data?.vehicles;
    if (!Array.isArray(vehicles) || vehicles.length === 0) return null;
    const plates = vehicles
      .slice(0, MAX_VEHICLES_PER_SUBSCRIPTION)
      .map((v) => String((v as { license_plate?: unknown })?.license_plate ?? "").trim());
    return { plates };
  } catch {
    return null;
  }
}
