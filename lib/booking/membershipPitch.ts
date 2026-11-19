import { planCoversCategory } from "./pricingDisplay";

/**
 * What the membership pop-up may claim. The price only once the plan has
 * loaded, and "N visits a month and the plan has paid for itself" only when
 * the plan really covers the service being booked, measured on that
 * service's price (extras are not covered, so they don't count).
 */
export function membershipPitch(opts: {
  planName: string | null;
  monthlyPrice: number;
  serviceCategory: string | null;
  /** The service's price per visit, as the page shows it (sale applied). */
  servicePrice: number;
}): { priceLabel: string | null; breakEvenVisits: number | null } {
  const { planName, monthlyPrice, serviceCategory, servicePrice } = opts;
  const priceLabel = monthlyPrice > 0 ? `$${monthlyPrice.toFixed(2)}` : null;
  const covers = !!planName && !!serviceCategory && planCoversCategory(planName, serviceCategory);
  const breakEvenVisits =
    priceLabel && covers && servicePrice > 0 ? Math.ceil(monthlyPrice / servicePrice) : null;
  return { priceLabel, breakEvenVisits };
}
