// Holiday sale — the single source of truth for both the booking UI (badges,
// strikethrough prices) and the server's authoritative pricing
// (lib/pricing/computeBookingAmount.ts). Flipping ACTIVE off ends the sale
// everywhere at once.
export const HOLIDAY_SALE_ACTIVE = true; // Set to false when sale ends
export const HOLIDAY_SALE_DISCOUNT = 0.05; // 5% off

/** Apply the sale discount to an amount (no-op while the sale is inactive). */
export function applyHolidaySale(amount: number): number {
  return HOLIDAY_SALE_ACTIVE ? amount * (1 - HOLIDAY_SALE_DISCOUNT) : amount;
}
