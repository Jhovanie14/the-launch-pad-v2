// Flock (family vehicle) pricing — the single source of truth for both the
// subscription UI and the server routes that actually create Stripe items.
//
// Rule: additional vehicles on a personal plan bill at 35% off the plan price.
// Commercial plans get NO family discount — every vehicle bills at the full
// plan price. Commercial rates are already cut to the bone, so a 35% discount
// on additional trucks is margin the business cannot give away.
//
// Every `* 0.65` and every hardcoded "35%" in the app routes through here.
// Changing the rate is a one-line change; adding a plan type is a one-function
// change. Nothing downstream re-derives the number.

/** Fraction off the plan price for each additional vehicle on a personal plan. */
export const FLOCK_DISCOUNT_RATE = 0.35;

/** What an additional vehicle costs, as a fraction of the plan price. */
export const FLOCK_PRICE_MULTIPLIER = 1 - FLOCK_DISCOUNT_RATE; // 0.65

/** Hard cap on vehicles per subscription, primary included. */
export const MAX_VEHICLES_PER_SUBSCRIPTION = 5;

/**
 * The shape every caller can supply. `is_commercial` is the stored column
 * (migration 20260804000000); `name` is the legacy signal.
 */
export interface FlockPlanLike {
  is_commercial?: boolean | null;
  name?: string | null;
}

/**
 * Is this a commercial plan?
 *
 * The stored column wins. Name matching is a fallback for rows written before
 * the migration backfilled, or edited outside the admin UI — without it, a
 * null column would silently hand a commercial customer the family discount.
 */
export function isCommercialPlan(plan: FlockPlanLike | null | undefined): boolean {
  if (!plan) return false;
  if (typeof plan.is_commercial === "boolean") return plan.is_commercial;
  return (plan.name ?? "").toLowerCase().includes("commercial");
}

/**
 * Multiplier applied to the plan price for each additional vehicle:
 * 1 on commercial plans (full price), 0.65 on personal plans.
 */
export function flockMultiplier(plan: FlockPlanLike | null | undefined): number {
  return isCommercialPlan(plan) ? 1 : FLOCK_PRICE_MULTIPLIER;
}

/** Discount percent for display — 0 on commercial plans, 35 on personal plans. */
export function flockDiscountPercent(plan: FlockPlanLike | null | undefined): number {
  return isCommercialPlan(plan) ? 0 : Math.round(FLOCK_DISCOUNT_RATE * 100);
}

/** Does this plan give any discount on additional vehicles? */
export function hasFlockDiscount(plan: FlockPlanLike | null | undefined): boolean {
  return flockMultiplier(plan) < 1;
}

/**
 * Price of one additional vehicle, in the same unit as `basePrice`.
 * Pass dollars for display, integer cents for Stripe.
 */
export function flockVehiclePrice(
  basePrice: number,
  plan: FlockPlanLike | null | undefined
): number {
  return basePrice * flockMultiplier(plan);
}

/** Stripe-safe integer-cent price for one additional vehicle. */
export function flockUnitAmountCents(
  baseAmountCents: number,
  plan: FlockPlanLike | null | undefined
): number {
  return Math.round(baseAmountCents * flockMultiplier(plan));
}

/** Amount saved on one additional vehicle. Zero on commercial plans. */
export function flockVehicleSavings(
  basePrice: number,
  plan: FlockPlanLike | null | undefined
): number {
  return basePrice - flockVehiclePrice(basePrice, plan);
}

/**
 * Recurring total for a subscription: primary at full price, every additional
 * vehicle at the plan's flock rate.
 */
export function subscriptionTotal(
  basePrice: number,
  vehicleCount: number,
  plan: FlockPlanLike | null | undefined
): number {
  const additional = Math.max(vehicleCount - 1, 0);
  return basePrice + flockVehiclePrice(basePrice, plan) * additional;
}

/**
 * Stripe price metadata for an additional-vehicle price. Commercial items are
 * tagged so the repricing script and any future audit can tell a full-price
 * flock item apart from a legacy discounted one.
 */
export function flockPriceMetadata(
  planId: string,
  plan: FlockPlanLike | null | undefined
): Record<string, string> {
  const commercial = isCommercialPlan(plan);
  return {
    plan_id: planId,
    is_flock_item: "true",
    is_flock_discount: commercial ? "false" : "true",
    flock_multiplier: String(flockMultiplier(plan)),
  };
}
