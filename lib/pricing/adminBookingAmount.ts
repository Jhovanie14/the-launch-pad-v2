import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";
import { computeBookingAmount } from "@/lib/pricing/computeBookingAmount";
import { applyHolidaySale } from "@/lib/booking/holidaySale";

export interface AdminPricingInput {
  /** Empty for an add-ons-only booking, which staff can still create. */
  servicePackageId: string;
  addOnIds: string[];
  /** The subscriber being booked for; null for a regular customer. */
  subscriberId: string | null;
  paymentMethod: "cash" | "subscription";
  /** Promo discount the admin applied in the modal. */
  discountPercent?: number;
}

export interface AdminPricingResult {
  servicePrice: number;
  total: number;
}

export const PLAN_NOT_COVERED_MESSAGE =
  "This subscriber's plan doesn't cover the selected service or add-ons. Take payment by cash or card instead.";

/** Clamp to 0–100 so a bad value can't raise the price or push it negative. */
export function applyAdminDiscount(amount: number, percent = 0): number {
  const p = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  return Number((amount * (1 - p / 100)).toFixed(2));
}

/**
 * Authoritative price for a booking an admin creates. Plan coverage is read
 * from the subscriber's active subscription in the database, the same rule the
 * online flow uses, so a Quick plan member booking an Express Detail pays for
 * it. The admin counts as the authenticated party taking cash.
 */
export async function computeAdminBookingAmount(
  db: SupabaseClient,
  input: AdminPricingInput
): Promise<AdminPricingResult> {
  // "subscription" means nothing is collected, so the plan must cover it all.
  const assertCovered = (amount: number) => {
    if (input.paymentMethod === "subscription" && amount > 0) {
      throw new ApiError(PLAN_NOT_COVERED_MESSAGE, 400);
    }
  };

  if (!input.servicePackageId) {
    if (input.addOnIds.length === 0) {
      throw new ApiError("Select a service package or at least one add-on", 400);
    }
    const { data: addOns } = await db
      .from("add_ons")
      .select("id, price")
      .in("id", input.addOnIds);
    const addOnsTotal = (addOns ?? []).reduce(
      (sum: number, a: any) => sum + Number(a.price),
      0
    );
    const amount = Number(applyHolidaySale(addOnsTotal).toFixed(2));
    assertCovered(amount);
    return {
      servicePrice: 0,
      total: applyAdminDiscount(amount, input.discountPercent),
    };
  }

  const priced = await computeBookingAmount(db, {
    servicePackageId: input.servicePackageId,
    addOnIds: input.addOnIds,
    userId: input.subscriberId,
    isAuthenticated: true,
    paymentMethod: input.paymentMethod,
  });

  assertCovered(priced.amount);

  return {
    servicePrice: priced.servicePrice,
    total: applyAdminDiscount(priced.amount, input.discountPercent),
  };
}
