import { describe, expect, it } from "vitest";
import {
  computeDisplayPricing,
  computeTotalDuration,
  isServiceFreeForDisplay,
  planCoversCategory,
} from "./pricingDisplay";
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "./holidaySale";

const sale = (n: number) =>
  Number((HOLIDAY_SALE_ACTIVE ? n * (1 - HOLIDAY_SALE_DISCOUNT) : n).toFixed(2));

describe("planCoversCategory (mirrors lib/pricing/computeBookingAmount.ts)", () => {
  it("quick service is covered by quick/exterior plans", () => {
    expect(planCoversCategory("Exterior Shine", "Quick Service")).toBe(true);
    expect(planCoversCategory("Quick Service Plan", "quick service")).toBe(true);
    expect(planCoversCategory("Express Detail", "quick service")).toBe(false);
  });
  it("express detail is covered by express/commercial plans", () => {
    expect(planCoversCategory("Express Detail", "Express Detail")).toBe(true);
    expect(planCoversCategory("Commercial Wash", "express detail")).toBe(true);
    expect(planCoversCategory("Exterior Shine", "express detail")).toBe(false);
  });
  it("unknown categories are never covered", () => {
    expect(planCoversCategory("Express Detail", "ceramic coating")).toBe(false);
  });
});

describe("isServiceFreeForDisplay", () => {
  it("requires a plan name AND the vehicle on the subscription", () => {
    expect(
      isServiceFreeForDisplay({ planName: "Express Detail", isVehicleSubscribed: true, category: "express detail" })
    ).toBe(true);
    expect(
      isServiceFreeForDisplay({ planName: "Express Detail", isVehicleSubscribed: false, category: "express detail" })
    ).toBe(false);
    expect(
      isServiceFreeForDisplay({ planName: null, isVehicleSubscribed: true, category: "express detail" })
    ).toBe(false);
  });
});

describe("computeDisplayPricing", () => {
  const service = { price: 100, category: "quick service" };
  const addOns = [
    { id: "a1", price: 10 },
    { id: "a2", price: 5 },
  ];

  it("non-subscriber: service + add-ons, sale applied for display", () => {
    const p = computeDisplayPricing({
      service, addOns, planName: null, isVehicleSubscribed: false, promo: null,
    });
    expect(p.isServiceFree).toBe(false);
    expect(p.originalTotal).toBe(115);
    expect(p.saleTotal).toBe(sale(115));
    expect(p.finalTotal).toBe(sale(115));
  });

  it("subscriber-free: only add-ons are charged", () => {
    const p = computeDisplayPricing({
      service, addOns, planName: "Exterior Shine", isVehicleSubscribed: true, promo: null,
    });
    expect(p.isServiceFree).toBe(true);
    expect(p.originalTotal).toBe(15);
    expect(p.finalTotal).toBe(sale(15));
  });

  it("subscriber whose vehicle is NOT on the subscription pays full", () => {
    const p = computeDisplayPricing({
      service, addOns, planName: "Exterior Shine", isVehicleSubscribed: false, promo: null,
    });
    expect(p.isServiceFree).toBe(false);
    expect(p.originalTotal).toBe(115);
  });

  it("percent promo applies after the sale", () => {
    const p = computeDisplayPricing({
      service, addOns: [], planName: null, isVehicleSubscribed: false,
      promo: { type: "percent", value: 10 },
    });
    expect(p.finalTotal).toBe(Number((sale(100) * 0.9).toFixed(2)));
  });

  it("flat promo floors at zero", () => {
    const p = computeDisplayPricing({
      service: { price: 5, category: "quick service" }, addOns: [],
      planName: null, isVehicleSubscribed: false,
      promo: { type: "flat", value: 50 },
    });
    expect(p.finalTotal).toBe(0);
  });

  it("savings = original − final", () => {
    const p = computeDisplayPricing({
      service, addOns, planName: null, isVehicleSubscribed: false, promo: null,
    });
    expect(p.savings).toBe(Number((115 - sale(115)).toFixed(2)));
  });

  it("handles missing service (still loading)", () => {
    const p = computeDisplayPricing({
      service: null, addOns, planName: null, isVehicleSubscribed: false, promo: null,
    });
    expect(p.originalTotal).toBe(15);
  });
});

describe("computeTotalDuration", () => {
  it("sums service and add-on durations", () => {
    expect(computeTotalDuration({ duration: 30 }, [{ duration: 10 }, { duration: 5 }])).toBe(45);
    expect(computeTotalDuration(null, [])).toBe(0);
  });
});
