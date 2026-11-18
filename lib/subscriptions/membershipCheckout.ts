// Checks for starting a membership (POST /api/create-checkout-session). Kept
// here, without Stripe or database calls, so they are tested.

import { plateError, normalizePlate } from "@/lib/booking/plate";
import { MAX_VEHICLES_PER_SUBSCRIPTION } from "@/lib/pricing/flockPricing";

export type MembershipCheckout = {
  planId: string;
  billingCycle: "monthly" | "yearly";
  /** Tidied plates, first one is the primary car. */
  plates: string[];
};

/** Plate compared with case, spaces and dashes ignored. */
export const plateKey = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * What the cart may send. Anything else in the body (a user id, a coupon id,
 * a per-car plan) is ignored: the account comes from the session and the
 * offer is decided on the server.
 */
export function parseMembershipCheckout(
  input: unknown
): { ok: true; value: MembershipCheckout } | { ok: false; error: string } {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const planId = typeof body.planId === "string" ? body.planId.trim() : "";
  if (!planId) return { ok: false, error: "Please choose a plan." };
  const billingCycle = body.billingCycle;
  if (billingCycle !== "monthly" && billingCycle !== "yearly") {
    return { ok: false, error: "Please choose monthly or yearly billing." };
  }

  const list: unknown[] = Array.isArray(body.vehicles) ? body.vehicles : body.vehicle ? [body.vehicle] : [];
  if (list.length === 0) return { ok: false, error: "At least one vehicle is required." };
  if (list.length > MAX_VEHICLES_PER_SUBSCRIPTION) {
    return { ok: false, error: `A membership covers up to ${MAX_VEHICLES_PER_SUBSCRIPTION} vehicles.` };
  }

  const plates: string[] = [];
  const seen = new Set<string>();
  for (const v of list) {
    const raw = (v as { license_plate?: unknown })?.license_plate;
    const plate = normalizePlate(typeof raw === "string" ? raw : "");
    const problem = plateError(plate);
    if (problem) return { ok: false, error: problem };
    const key = plateKey(plate);
    if (seen.has(key)) return { ok: false, error: `${plate} is in the list twice.` };
    seen.add(key);
    plates.push(plate);
  }

  return { ok: true, value: { planId, billingCycle, plates } };
}

/**
 * The first-period offer in cents: a percentage of the PRIMARY car's price,
 * for someone who has never had a membership. This is what the cart shows
 * (lib/pricing/firstSubscriptionPromo.ts). The route turns it into a coupon
 * that Stripe applies to the first invoice only, so renewals are full price.
 */
export function firstPeriodDiscountCents(input: {
  hadMembershipBefore: boolean;
  promo: { enabled: boolean; percent: number };
  primaryCarCents: number;
}): number {
  const { promo } = input;
  if (input.hadMembershipBefore || !promo.enabled || promo.percent <= 0) return 0;
  if (!Number.isFinite(input.primaryCarCents) || input.primaryCarCents <= 0) return 0;
  return Math.round((input.primaryCarCents * Math.min(promo.percent, 100)) / 100);
}
