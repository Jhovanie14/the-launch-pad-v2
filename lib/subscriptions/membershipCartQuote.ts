import {
  MAX_VEHICLES_PER_SUBSCRIPTION,
  flockDiscountPercent,
  flockUnitAmountCents,
  isCommercialPlan,
} from "@/lib/pricing/flockPricing";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import { firstPeriodDiscountCents } from "./membershipCheckout";

export interface CartQuote {
  period: "month" | "year";
  periodShort: "/mo" | "/yr";
  isCommercial: boolean;
  /** 35 on personal plans, 0 on commercial. */
  discountPercent: number;
  /** Car 1 is the plan price; each extra car is billed as the server bills it. */
  cars: { cents: number; primary: boolean }[];
  /** What one extra car saves per period; 0 on commercial plans. */
  extraCarSavingCents: number;
  offerPercent: number;
  offerCents: number;
  hasOffer: boolean;
  /** What the first period costs (with the offer, when it applies). */
  firstCents: number;
  /** What every later period costs. */
  renewalCents: number;
}

/**
 * Every number the membership cart shows, computed with the same cent maths
 * the checkout route uses (flockUnitAmountCents, firstPeriodDiscountCents),
 * so the screen and the Stripe charge cannot disagree.
 */
export function membershipCartQuote(input: {
  plan: {
    name?: string | null;
    is_commercial?: boolean | null;
    monthly_price: number | string;
    yearly_price: number | string;
  };
  billing: "monthly" | "yearly";
  carCount: number;
  /** No earlier membership on this account (guests count as eligible). */
  offerEligible: boolean;
}): CartQuote {
  const { plan, billing } = input;
  const yearly = billing === "yearly";
  const baseCents = Math.round(Number(yearly ? plan.yearly_price : plan.monthly_price) * 100) || 0;
  const count = Math.min(Math.max(Math.trunc(input.carCount) || 1, 1), MAX_VEHICLES_PER_SUBSCRIPTION);
  const extraCents = flockUnitAmountCents(baseCents, plan);

  const cars = Array.from({ length: count }, (_, i) => ({
    cents: i === 0 ? baseCents : extraCents,
    primary: i === 0,
  }));
  const renewalCents = cars.reduce((sum, c) => sum + c.cents, 0);
  const offerCents = firstPeriodDiscountCents({
    hadMembershipBefore: !input.offerEligible,
    promo: FIRST_SUBSCRIPTION_PROMO,
    primaryCarCents: baseCents,
  });

  return {
    period: yearly ? "year" : "month",
    periodShort: yearly ? "/yr" : "/mo",
    isCommercial: isCommercialPlan(plan),
    discountPercent: flockDiscountPercent(plan),
    cars,
    extraCarSavingCents: baseCents - extraCents,
    offerPercent: offerCents > 0 ? FIRST_SUBSCRIPTION_PROMO.percent : 0,
    offerCents,
    hasOffer: offerCents > 0,
    firstCents: renewalCents - offerCents,
    renewalCents,
  };
}

export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/** A saving in whole dollars ("$907", "$1,235"), short enough for the car buttons. */
export const savingLabel = (cents: number): string =>
  `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/**
 * May the cart show the first-membership offer, and is the price settled
 * enough to check out? A signed-in customer's history decides it, so until it
 * is known there is no offer and no checkout (a returning member must never
 * agree to the discounted price). A failed lookup shows the full price.
 * Guests are shown the offer; the server decides after sign-in.
 */
export function offerState(input: {
  signedIn: boolean;
  history: "unknown" | "none" | "had" | "error";
}): { offerEligible: boolean; settled: boolean } {
  if (!input.signedIn) return { offerEligible: true, settled: true };
  if (input.history === "unknown") return { offerEligible: false, settled: false };
  return { offerEligible: input.history === "none", settled: true };
}

/** Changes whenever the amounts in the agreement change, so the tick must be given again. */
export function agreementKey(q: CartQuote): string {
  return [q.hasOffer, q.firstCents, q.renewalCents, q.period].join("|");
}
