import { describe, expect, it } from "vitest";
import {
  FLOCK_DISCOUNT_RATE,
  FLOCK_PRICE_MULTIPLIER,
  flockDiscountPercent,
  flockMultiplier,
  flockPriceMetadata,
  flockUnitAmountCents,
  flockVehiclePrice,
  flockVehicleSavings,
  findReusableFlockPrice,
  hasFlockDiscount,
  isCommercialPlan,
  subscriptionTotal,
} from "./flockPricing";

const personal = { is_commercial: false, name: "Express Detail Unlimited" };
const commercial = { is_commercial: true, name: "Commercial Wash" };

describe("isCommercialPlan", () => {
  it("uses the stored column when present", () => {
    expect(isCommercialPlan(commercial)).toBe(true);
    expect(isCommercialPlan(personal)).toBe(false);
  });

  it("lets the column override a misleading name in both directions", () => {
    // A plan named "Commercial" that was explicitly unflagged stays personal.
    expect(isCommercialPlan({ is_commercial: false, name: "Commercial Wash" })).toBe(false);
    // A flagged plan stays commercial no matter what it is called.
    expect(isCommercialPlan({ is_commercial: true, name: "Fleet Wash" })).toBe(true);
  });

  it("falls back to name matching when the column is null or missing", () => {
    expect(isCommercialPlan({ is_commercial: null, name: "Commercial Wash" })).toBe(true);
    expect(isCommercialPlan({ name: "COMMERCIAL VEHICLE PLAN" })).toBe(true);
    expect(isCommercialPlan({ name: "Express Detail" })).toBe(false);
  });

  it("treats a missing plan as non-commercial rather than throwing", () => {
    expect(isCommercialPlan(null)).toBe(false);
    expect(isCommercialPlan(undefined)).toBe(false);
    expect(isCommercialPlan({})).toBe(false);
  });
});

describe("flockMultiplier", () => {
  it("charges commercial additional vehicles the full plan price", () => {
    expect(flockMultiplier(commercial)).toBe(1);
  });

  it("charges personal additional vehicles the discounted rate", () => {
    expect(flockMultiplier(personal)).toBe(FLOCK_PRICE_MULTIPLIER);
    expect(FLOCK_PRICE_MULTIPLIER).toBeCloseTo(0.65, 10);
  });
});

describe("display helpers", () => {
  it("reports no discount percent on commercial plans", () => {
    expect(flockDiscountPercent(commercial)).toBe(0);
    expect(hasFlockDiscount(commercial)).toBe(false);
  });

  it("reports the family discount percent on personal plans", () => {
    expect(flockDiscountPercent(personal)).toBe(35);
    expect(hasFlockDiscount(personal)).toBe(true);
    expect(FLOCK_DISCOUNT_RATE).toBeCloseTo(0.35, 10);
  });
});

describe("flockVehiclePrice / savings", () => {
  it("gives a commercial additional vehicle the same price as the primary", () => {
    expect(flockVehiclePrice(100, commercial)).toBe(100);
    expect(flockVehicleSavings(100, commercial)).toBe(0);
  });

  it("discounts a personal additional vehicle", () => {
    expect(flockVehiclePrice(100, personal)).toBeCloseTo(65, 10);
    expect(flockVehicleSavings(100, personal)).toBeCloseTo(35, 10);
  });
});

describe("flockUnitAmountCents", () => {
  it("returns the untouched base amount for commercial plans", () => {
    expect(flockUnitAmountCents(6999, commercial)).toBe(6999);
  });

  it("rounds to whole cents for Stripe", () => {
    // 6999 * 0.65 = 4549.35 -> 4549
    expect(flockUnitAmountCents(6999, personal)).toBe(4549);
    expect(Number.isInteger(flockUnitAmountCents(6999, personal))).toBe(true);
  });
});

describe("subscriptionTotal", () => {
  it("bills every commercial vehicle at full price", () => {
    expect(subscriptionTotal(100, 3, commercial)).toBe(300);
  });

  it("bills the primary full and additional personal vehicles discounted", () => {
    expect(subscriptionTotal(100, 3, personal)).toBeCloseTo(230, 10);
  });

  it("is just the base price for a single vehicle on either plan type", () => {
    expect(subscriptionTotal(100, 1, personal)).toBe(100);
    expect(subscriptionTotal(100, 1, commercial)).toBe(100);
  });

  it("never goes below the base price for an empty or malformed count", () => {
    expect(subscriptionTotal(100, 0, personal)).toBe(100);
    expect(subscriptionTotal(100, -3, personal)).toBe(100);
  });
});

describe("flockPriceMetadata", () => {
  it("marks commercial flock items as undiscounted", () => {
    const meta = flockPriceMetadata("plan_1", commercial);
    expect(meta.is_flock_discount).toBe("false");
    expect(meta.flock_multiplier).toBe("1");
    expect(meta.plan_id).toBe("plan_1");
  });

  it("marks personal flock items as discounted", () => {
    const meta = flockPriceMetadata("plan_2", personal);
    expect(meta.is_flock_discount).toBe("true");
    expect(meta.flock_multiplier).toBe("0.65");
  });

  it("tags every additional-vehicle price as a flock item regardless of plan type", () => {
    expect(flockPriceMetadata("p", commercial).is_flock_item).toBe("true");
    expect(flockPriceMetadata("p", personal).is_flock_item).toBe("true");
  });
});

describe("findReusableFlockPrice", () => {
  const flock = (id: string, unit_amount = 3899, interval = "month") => ({
    id,
    unit_amount,
    recurring: { interval, interval_count: 1 },
    metadata: { is_flock_item: "true", is_flock_discount: "true" },
  });
  const target = { unitAmount: 3899, interval: "month", intervalCount: 1 };

  it("reuses a matching flock price the subscription is not using yet", () => {
    expect(findReusableFlockPrice([flock("price_a")], target, [])?.id).toBe("price_a");
  });

  it("skips a price already on the subscription — Stripe rejects a duplicate price", () => {
    // Second family vehicle: the first one already holds price_a.
    expect(findReusableFlockPrice([flock("price_a")], target, ["price_a"])).toBeUndefined();
    expect(
      findReusableFlockPrice([flock("price_a"), flock("price_b")], target, ["price_a"])?.id
    ).toBe("price_b");
  });

  it("ignores prices with the wrong amount, interval or no flock tag", () => {
    const untagged = { ...flock("price_c"), metadata: {} };
    const legacy = { ...flock("price_d"), metadata: { is_flock_discount: "true" } };
    expect(findReusableFlockPrice([flock("price_x", 5999)], target, [])).toBeUndefined();
    expect(findReusableFlockPrice([flock("price_y", 3899, "year")], target, [])).toBeUndefined();
    expect(findReusableFlockPrice([untagged], target, [])).toBeUndefined();
    expect(findReusableFlockPrice([legacy], target, [])?.id).toBe("price_d");
  });
});
