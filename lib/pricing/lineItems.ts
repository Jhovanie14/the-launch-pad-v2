import { applyHolidaySale } from "@/lib/booking/holidaySale";

/**
 * Unit amounts (in cents) for the Stripe checkout line items.
 * `servicePrice` comes from computeBookingAmount and is already
 * sale-discounted; `addOnPrices` are raw DB prices, so the sale is applied
 * here. `discountFactor` distributes a validated promo proportionally so the
 * line items sum to the authoritative charged amount.
 */
export function buildLineItemUnitAmounts(input: {
  servicePrice: number;
  addOnPrices: number[];
  discountFactor: number;
}): { serviceCents: number; addOnCents: number[] } {
  return {
    serviceCents: Math.round(input.servicePrice * 100 * input.discountFactor),
    addOnCents: input.addOnPrices.map((p) =>
      Math.round(applyHolidaySale(p) * 100 * input.discountFactor)
    ),
  };
}
