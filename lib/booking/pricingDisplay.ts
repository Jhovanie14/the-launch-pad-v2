// Client-side price DISPLAY helpers. They mirror the server's authoritative
// rules in lib/pricing/computeBookingAmount.ts + validatePromo.ts so the UI
// previews what the server will charge. They must never feed a charge amount.
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "./holidaySale";

export interface DisplayService {
  price: number;
  category: string | null;
}

export interface DisplayAddOn {
  id: string;
  price: number;
}

export interface AppliedPromo {
  type: "percent" | "flat";
  value: number;
}

/** Mirror of planCoversCategory in lib/pricing/computeBookingAmount.ts. */
export function planCoversCategory(planName: string, category: string): boolean {
  const name = planName.toLowerCase();
  const cat = category.toLowerCase();
  if (cat === "quick service")
    return name.includes("quick") || name.includes("exterior");
  if (cat === "express detail")
    return name.includes("express") || name.includes("commercial");
  return false;
}

export function isServiceFreeForDisplay(opts: {
  planName: string | null | undefined;
  isVehicleSubscribed: boolean;
  category: string | null | undefined;
}): boolean {
  if (!opts.planName || !opts.isVehicleSubscribed) return false;
  return planCoversCategory(opts.planName, opts.category ?? "");
}

/** Display-only holiday sale discount. */
export function applySale(amount: number): number {
  return HOLIDAY_SALE_ACTIVE ? amount * (1 - HOLIDAY_SALE_DISCOUNT) : amount;
}

export interface DisplayPricing {
  isServiceFree: boolean;
  /** Before sale and promo; service counted as 0 when subscription-free. */
  originalTotal: number;
  /** After the display-only holiday sale. */
  saleTotal: number;
  /** After sale and applied promo — what the UI shows as "Total". */
  finalTotal: number;
  savings: number;
}

export function computeDisplayPricing(opts: {
  service: DisplayService | null;
  addOns: DisplayAddOn[];
  planName: string | null | undefined;
  isVehicleSubscribed: boolean;
  promo: AppliedPromo | null;
}): DisplayPricing {
  const isServiceFree = isServiceFreeForDisplay({
    planName: opts.planName,
    isVehicleSubscribed: opts.isVehicleSubscribed,
    category: opts.service?.category,
  });
  const servicePrice = isServiceFree ? 0 : Number(opts.service?.price ?? 0);
  const addOnsTotal = opts.addOns.reduce((sum, a) => sum + Number(a.price), 0);
  const originalTotal = servicePrice + addOnsTotal;
  const saleTotal = applySale(originalTotal);

  let finalTotal = saleTotal;
  if (opts.promo) {
    finalTotal =
      opts.promo.type === "flat"
        ? Math.max(0, saleTotal - opts.promo.value)
        : saleTotal * (1 - opts.promo.value / 100);
  }

  return {
    isServiceFree,
    originalTotal: round2(originalTotal),
    saleTotal: round2(saleTotal),
    finalTotal: round2(finalTotal),
    savings: round2(originalTotal - finalTotal),
  };
}

export function computeTotalDuration(
  service: { duration: number | null } | null,
  addOns: { duration: number | null }[]
): number {
  const base = Number(service?.duration) || 0;
  return base + addOns.reduce((sum, a) => sum + Number(a.duration), 0);
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
