import { describe, expect, it } from "vitest";
import { FIRST_SUBSCRIPTION_PROMO, firstPeriodPrice } from "./firstSubscriptionPromo";

describe("FIRST_SUBSCRIPTION_PROMO", () => {
  it("is 10% off the first period", () => {
    expect(FIRST_SUBSCRIPTION_PROMO.percent).toBe(10);
  });
});

describe("firstPeriodPrice", () => {
  it("takes 10% off Basic and Deluxe, rounded to the cent", () => {
    expect(firstPeriodPrice(39.99)).toBe(35.99);
    expect(firstPeriodPrice(59.99)).toBe(53.99);
  });

  it("returns the regular price when the promo is off", () => {
    expect(firstPeriodPrice(39.99, { enabled: false, percent: 10 })).toBe(39.99);
  });
});
