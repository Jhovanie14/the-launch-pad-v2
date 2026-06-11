// Display-only holiday sale. The server NEVER applies this discount
// (lib/pricing/computeBookingAmount.ts is authoritative); these constants only
// control badges and strikethrough prices in the booking UI.
export const HOLIDAY_SALE_ACTIVE = true; // Set to false when sale ends
export const HOLIDAY_SALE_DISCOUNT = 0.05; // 5% off
