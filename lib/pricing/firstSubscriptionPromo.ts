/**
 * First-time subscribers get 10% off their first billing period (Stripe
 * coupon applied at checkout). One place for the plan cards and the cart.
 * Set enabled to false when the offer ends.
 */
export const FIRST_SUBSCRIPTION_PROMO = {
  enabled: true,
  percent: 10,
} as const;

type Promo = { enabled: boolean; percent: number };

/** Price of the first period with the offer applied, rounded to the cent. */
export function firstPeriodPrice(price: number, promo: Promo = FIRST_SUBSCRIPTION_PROMO): number {
  if (!promo.enabled || promo.percent <= 0) return price;
  return Math.round(price * (1 - promo.percent / 100) * 100) / 100;
}
