import { describe, expect, it } from "vitest";
import { membershipPitch } from "./membershipPitch";

describe("membershipPitch", () => {
  it("plan covers the booked service → break-even on the service price", () => {
    expect(
      membershipPitch({ planName: "Express Detail", monthlyPrice: 59.99, serviceCategory: "express detail", servicePrice: 61.75 })
    ).toEqual({ priceLabel: "$59.99", breakEvenVisits: 1 });
    expect(
      membershipPitch({ planName: "Express Detail", monthlyPrice: 59.99, serviceCategory: "express detail", servicePrice: 38 })
    ).toEqual({ priceLabel: "$59.99", breakEvenVisits: 2 });
  });

  it("plan doesn't cover the booked service → no break-even claim", () => {
    expect(
      membershipPitch({ planName: "Express Detail", monthlyPrice: 59.99, serviceCategory: "quick service", servicePrice: 23.75 })
        .breakEvenVisits
    ).toBeNull();
  });

  it("plan not loaded yet → no price and no claim", () => {
    expect(membershipPitch({ planName: null, monthlyPrice: 0, serviceCategory: "express detail", servicePrice: 38 })).toEqual({
      priceLabel: null,
      breakEvenVisits: null,
    });
  });

  it("no service price (free or unknown) → no claim", () => {
    expect(
      membershipPitch({ planName: "Express Detail", monthlyPrice: 59.99, serviceCategory: "express detail", servicePrice: 0 })
        .breakEvenVisits
    ).toBeNull();
    expect(
      membershipPitch({ planName: "Express Detail", monthlyPrice: 59.99, serviceCategory: null, servicePrice: 38 }).breakEvenVisits
    ).toBeNull();
  });
});
